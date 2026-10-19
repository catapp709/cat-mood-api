/* ============================================================
   server.js — 本地开发服务器（零依赖，Node 自带模块即可运行）
   职责：
   1. 启动时读取 .env，把 AI_* 配置载入环境变量
   2. 提供 /config.js，把配置注入给页面（.env 文件本身不对外提供）
   3. 托管项目静态文件

   启动：node server.js   然后浏览器访问 http://localhost:8090
   改了 .env 后：重新启动一次（Ctrl+C 再 node server.js）
   ============================================================ */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8090;

/* ---------- 读取 .env：KEY=VALUE 逐行解析 → 写入环境变量 ---------- */
(function loadDotEnv() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    raw.split(/\r?\n/).forEach(line => {
      if (!line.trim() || line.trim().startsWith('#')) return; // 跳过空行和注释
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) return;
      const val = m[2].trim().replace(/^["']|["']$/g, ''); // 去掉首尾引号
      if (!(m[1] in process.env)) process.env[m[1]] = val;  // 系统已有环境变量时优先用系统的
    });
    const provider = process.env.AI_PROVIDER || '';
    console.log(provider ? `✓ 已配置情绪识别供应商：${provider}` : '⚠ 未配置 AI_PROVIDER，将使用 Mock 兜底');
  } catch {
    console.log('⚠ 未找到 .env 文件，情绪识别将使用 Mock 兜底');
  }
})();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon'
};

/* ============================================================
   服务端情绪识别代理（/api/detect）
   前端只把音频 base64 发到本地服务，由服务端持 Key 转发到真实供应商。
   请求体：{ audioBase64, audioType?, prompt?, provider? }
   响应体：{ code:0, data: EmotionResult } 或 { code:1, message }
   ============================================================ */

/* 读取 POST 请求体为 Buffer */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/* HTTPS POST JSON（用于阿里云） */
function httpsPostJson(url, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(bodyObj);
    const req = https.request({
      hostname: u.hostname, port: u.port || 443,
      path: u.pathname + u.search, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/* HTTPS POST multipart/form-data（用于宠智灵） */
function httpsPostMultipart(url, headers, fields, fileField, fileBuf, fileName, fileMime) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const boundary = '----cma' + Date.now();
    const parts = [];
    for (const [k, v] of Object.entries(fields)) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
    }
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: ${fileMime}\r\n\r\n`));
    parts.push(fileBuf);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);
    const req = https.request({
      hostname: u.hostname, port: u.port || 443,
      path: u.pathname + u.search, method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        ...headers
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* 从模型自由文本中提取 JSON（兼容 ```json 代码块、纯文本第一个 {...}） */
function parseJsonFromText(text) {
  if (!text) return null;
  try { return JSON.parse(text.trim()); } catch { /* 继续 */ }
  const code = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (code) { try { return JSON.parse(code[1].trim()); } catch { /* 继续 */ } }
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) { try { return JSON.parse(brace[0]); } catch { /* 继续 */ } }
  return null;
}

/* 标准化为 EmotionResult（与前端 types/index.js 保持一致） */
function normalizeResult(raw, provider) {
  const emotion = (raw && raw.emotion) ? String(raw.emotion).trim() : '未知';
  let confidence = Number(raw && raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));
  const translation = (raw && raw.translation) ? String(raw.translation).trim() : '';
  return {
    emotion, confidence,
    translation: translation || `识别为「${emotion}」，置信度 ${confidence}%`,
    provider
  };
}

/* 阿里云 Qwen-Audio */
async function callAliyun(audioBase64, prompt) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('服务端未配置 DASHSCOPE_API_KEY');
  const defaultPrompt = '请分析这段猫咪叫声的情绪。只回答 JSON 格式，不要任何多余文字：{"emotion":"情绪词（如开心/生气/撒娇/恐惧/平静/饥饿）","confidence":0-100,"translation":"一句话解释"}';
  const body = {
    model: 'qwen-audio-turbo',
    input: { messages: [{ role: 'user', content: [
      { audio: `data:;base64,${audioBase64}` },
      { text: prompt || defaultPrompt }
    ] }] }
  };
  const { status, body: respText } = await httpsPostJson(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    { 'Authorization': `Bearer ${apiKey}` }, body
  );
  if (status === 401) throw new Error('DASHSCOPE_API_KEY 无效或已过期（401）');
  if (status === 403) throw new Error('访问被拒绝（403）：可能 Key 权限不足');
  if (status === 400) throw new Error('请求参数错误（400）：请检查音频格式或 prompt');
  if (status >= 500) throw new Error(`阿里云服务异常（${status}），请稍后再试`);
  if (status < 200 || status >= 300) throw new Error(`识别请求失败（HTTP ${status}）`);
  let json;
  try { json = JSON.parse(respText); } catch { throw new Error('阿里云返回了无法解析的响应'); }
  const text = json?.output?.choices?.[0]?.message?.content?.[0]?.text || '';
  if (!text) throw new Error('阿里云返回结果为空');
  const parsed = parseJsonFromText(text);
  return normalizeResult(parsed || { translation: text }, 'aliyun');
}

/* 宠智灵（备份） */
async function callChongzhiling(audioBase64, animalType) {
  const token = process.env.CHONGZHILING_TOKEN;
  if (!token) throw new Error('服务端未配置 CHONGZHILING_TOKEN');
  const wavBuf = Buffer.from(audioBase64, 'base64');
  const { status, body: respText } = await httpsPostMultipart(
    'https://ms-ai.chongzhiling.com/api/v2.0/ai-b/ai-voice-recg/analysis-json-no-session',
    { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    { animal_type: String(animalType || 1) },
    'voice', wavBuf, 'cat-voice.wav', 'audio/wav'
  );
  if (status === 401) throw new Error('宠智灵 Token 无效或已过期（401）');
  if (status === 403) throw new Error('访问被拒绝（403）');
  if (status === 400) throw new Error('请求参数错误（400）：请检查音频格式（宠智灵需 wav）');
  if (status >= 500) throw new Error(`宠智灵服务异常（${status}），请稍后再试`);
  if (status < 200 || status >= 300) throw new Error(`识别请求失败（HTTP ${status}）`);
  let json;
  try { json = JSON.parse(respText); } catch { throw new Error('宠智灵返回了无法解析的响应'); }
  if (!json || json.success === false) throw new Error(json?.message || '宠智灵识别失败');
  const sr = json.data?.structured_result || {};
  const emotion = sr.voice_category || sr.voice_label || '未知';
  const label = sr.voice_label ? `（${sr.voice_label}）` : '';
  const translation = sr.translation || json.data?.analysis_result || '';
  const confidence = sr.voice_category ? 100 : 0;
  return normalizeResult({ emotion: emotion + label, confidence, translation }, 'chongzhiling');
}

/* Mock 兜底 */
function mockResult() {
  const moods = ['平静', '开心', '撒娇', '想玩', '饥饿', '放松'];
  const emotion = moods[Math.floor(Math.random() * moods.length)];
  const confidence = 60 + Math.floor(Math.random() * 30);
  return normalizeResult({
    emotion, confidence,
    translation: '（模拟数据）当前未配置真实识别服务，已返回兜底结果。'
  }, 'mock');
}

/* /api/detect 总入口 */
async function handleDetect(req, res) {
  const sendJson = (code, data) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(code === 0 ? { code: 0, data } : { code, message: data }));
  };
  try {
    const buf = await readBody(req);
    let payload;
    try { payload = JSON.parse(buf.toString('utf8')); } catch { throw new Error('请求体不是合法 JSON'); }
    const { audioBase64, prompt, provider } = payload || {};
    if (!audioBase64) throw new Error('缺少音频数据 audioBase64');
    const target = (provider || process.env.AI_PROVIDER || 'mock').toLowerCase();
    let result;
    if (target === 'aliyun') {
      result = await callAliyun(audioBase64, prompt || process.env.ALIYUN_PROMPT);
    } else if (target === 'chongzhiling' || target === 'czl') {
      result = await callChongzhiling(audioBase64, process.env.CZL_ANIMAL_TYPE || 1);
    } else {
      result = mockResult();
    }
    sendJson(0, result);
  } catch (err) {
    console.error('[detect] 代理失败：', err.message);
    sendJson(1, err.message || '识别服务异常');
  }
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  /* ========== CORS：所有响应统一加上，支持跨域调用 ========== */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  /* OPTIONS 预检直接返回 204，不进入业务逻辑 */
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  /* 情绪识别代理：前端 POST 音频 base64，服务端持 Key 转发到真实供应商 */
  if (urlPath === '/api/detect' && req.method === 'POST') {
    handleDetect(req, res);
    return;
  }

  /* 配置注入点：页面加载 config.js 后即可通过 window.__APP_CONFIG__ 取到 */
  if (urlPath === '/config.js') {
    res.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store' // 不缓存：改完 .env 重启后刷新页面即可生效
    });
    res.end('window.__APP_CONFIG__ = ' + JSON.stringify({
      /* 情绪识别供应商选择：'aliyun' | 'chongzhiling' | 'mock' */
      AI_PROVIDER:          process.env.AI_PROVIDER          || 'mock',
      /* 阿里云 prompt（非敏感，可下发） */
      ALIYUN_PROMPT:        process.env.ALIYUN_PROMPT        || '',
      /* 宠智灵动物类型（非敏感，可下发） */
      CZL_ANIMAL_TYPE:      process.env.CZL_ANIMAL_TYPE      || '1'
      /* ⚠ DASHSCOPE_API_KEY / CHONGZHILING_TOKEN 不下发前端，由服务端代理持有 */
    }) + ';');
    return;
  }

  /* 配置文件本身不直接对外 */
  if (urlPath === '/.env' || urlPath === '/server.js') {
    res.writeHead(403); res.end('forbidden'); return;
  }

  let file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store' // 开发期不缓存，改完代码刷新即生效
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`喵语原型已启动：http://localhost:${PORT}`);
});
