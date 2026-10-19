/* ============================================================
   api.js — 工具层 + 历史记录 mock
   职责：
   1. 提供音频格式转换工具（webmToWav / blobToBase64），供各 Provider 复用
   2. 提供历史记录、猫资料等本地 mock 接口
   ⚠ 情绪识别的网络请求已迁移到 services/ 目录，本文件不再包含任何供应商 API 调用。
   ============================================================ */
const delay = ms => new Promise(r => setTimeout(r, ms));
const LS = { extra: 'cma.history.extra', deleted: 'cma.history.deleted', remind: 'cma.remind', cat: 'cma.cat' };
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* ---------- 音频工具（供 services/* Provider 复用） ---------- */

/* Blob → base64 string（FileReader 异步方式，兼容浏览器） */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1] || ''); // 去掉 data:*;base64, 前缀
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ---------- 浏览器端 WAV 编码器（零依赖，解决 webm → wav 格式问题） ---------- */
/* 为什么需要它：
   MediaRecorder 在 Chrome/Edge 上输出 webm/opus，Safari 输出 webm；
   部分供应商（如宠智灵）只认 wav/mp3/aac/m4a，不认 webm。
   本函数用 Web Audio API 解码任意浏览器音频格式 → Float32 PCM → 组装标准 WAV。
   ⚠ 此函数为既有逻辑，严禁修改。 */

/**
 * 任意浏览器音频 Blob → 16-bit PCM 单声道 44100Hz WAV Blob
 * @param {Blob} blob MediaRecorder 产出的原始录音（webm/ogg/mp4 等）
 * @returns {Promise<Blob>} audio/wav 类型的标准 WAV Blob
 * 失败时（如浏览器不支持 AudioContext、解码失败）抛出 Error
 */
async function webmToWav(blob) {
  /* 1. Blob → ArrayBuffer */
  const arrayBuf = await blob.arrayBuffer();

  /* 2. AudioContext 解码（浏览器自动处理 webm/ogg/mp4 → PCM） */
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('当前浏览器不支持 Web Audio API，无法转换格式');
  const ctx = new Ctx();
  let audioBuf;
  try {
    audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0)); // slice(0) 拷贝一份，原始 arrayBuf 可能被复用
  } catch (e) {
    ctx.close();
    throw e;
  }

  /* 3. 先从 AudioBuffer 提取元数据 + 声道数据（ctx.close 之后某些 Safari 版本数据会失效） */
  const TARGET_SR = 44100;
  const origSR = audioBuf.sampleRate;
  const origLen = audioBuf.length;
  const numChannels = audioBuf.numberOfChannels;
  /* 先把声道数据拷贝出来，再关闭 context */
  const channels = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(new Float32Array(audioBuf.getChannelData(c))); // 拷贝一份
  }
  ctx.close(); // 所有数据提取完毕，现在可以安全关闭

  /* 4. 重采样 + 混合到单声道 */
  let float32;
  if (origSR === TARGET_SR && numChannels === 1) {
    float32 = channels[0]; // 已经是 44100 单声道，直接用拷贝好的数据
  } else {
    const outLen = Math.round(origLen * TARGET_SR / origSR);
    float32 = new Float32Array(outLen);
    const ch0 = channels[0];
    const ch1 = numChannels > 1 ? channels[1] : null;
    for (let i = 0; i < outLen; i++) {
      const srcIdx = i * origSR / TARGET_SR;
      const i0 = Math.floor(srcIdx);
      const i1 = Math.min(i0 + 1, origLen - 1);
      const t = srcIdx - i0;
      let s = ch0[i0] * (1 - t) + ch0[i1] * t;
      if (ch1) s = (s + (ch1[i0] * (1 - t) + ch1[i1] * t)) / 2;
      float32[i] = s;
    }
  }

  /* 5. Float32 → 16-bit PCM（缩放裁剪到 [-1, 1]） */
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  /* 6. 构建 44 字节 WAV 头 + PCM 数据 */
  const pcmBytes = int16.buffer;
  const dataSize = pcmBytes.byteLength;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const wavBuf = new ArrayBuffer(totalSize);
  const view = new DataView(wavBuf);

  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  const writeU32 = (offset, val) => view.setUint32(offset, val, true); // true = little-endian
  const writeU16 = (offset, val) => view.setUint16(offset, val, true);

  writeStr(0, 'RIFF');          // ChunkID
  writeU32(4, totalSize - 8);   // ChunkSize（文件总长 - 8）
  writeStr(8, 'WAVE');          // Format
  writeStr(12, 'fmt ');         // Subchunk1ID
  writeU32(16, 16);             // Subchunk1Size（PCM = 16）
  writeU16(20, 1);              // AudioFormat（1 = PCM）
  writeU16(22, 1);              // NumChannels（单声道）
  writeU32(24, TARGET_SR);      // SampleRate
  writeU32(28, TARGET_SR * 2);  // ByteRate（SampleRate * NumChannels * BitsPerSample/8）
  writeU16(32, 2);              // BlockAlign（NumChannels * BitsPerSample/8）
  writeU16(34, 16);             // BitsPerSample（16-bit）
  writeStr(36, 'data');         // Subchunk2ID
  writeU32(40, dataSize);       // Subchunk2Size
  /* 复制 PCM 数据到 WAV buffer 后半部分 */
  new Uint8Array(wavBuf, headerSize).set(new Uint8Array(pcmBytes));

  return new Blob([wavBuf], { type: 'audio/wav' });
}

/* ---------- 历史记录等其他接口（mock，待接真实后端） ---------- */
async function fetchHistory() {
  await delay(240);
  const deleted = new Set(lsGet(LS.deleted, []));
  const extra = lsGet(LS.extra, []);
  const all = [...extra, ...DB.history].filter(r => !deleted.has(r.id));
  return { code: 0, data: all };
}
async function saveRecord(rec) {
  await delay(260);
  const extra = lsGet(LS.extra, []);
  const now = new Date();
  const item = {
    id: 'u' + now.getTime(),
    moodKey: rec.moodKey || null,
    conf: rec.conf ?? null,
    reply: rec.reply,
    group: '今天',
    time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  };
  extra.unshift(item);
  lsSet(LS.extra, extra);
  return { code: 0, data: { id: item.id } };
}
async function deleteRecord(id) {
  await delay(180);
  lsSet(LS.deleted, [...lsGet(LS.deleted, []), id]);
  lsSet(LS.extra, lsGet(LS.extra, []).filter(r => r.id !== id));
  return { code: 0 };
}
async function fetchCatProfile() {
  await delay(200);
  return { code: 0, data: { ...DB.cat, ...lsGet(LS.cat, {}) } };
}
async function saveCatProfile(patch) {
  await delay(220);
  const merged = { ...lsGet(LS.cat, {}), ...patch };
  lsSet(LS.cat, merged);
  return { code: 0, data: { ...DB.cat, ...merged } };
}
async function fetchWeeklySummary() {
  await delay(200);
  return { code: 0, data: DB.weekly };
}
async function putRemindSetting(on) {
  await delay(120);
  lsSet(LS.remind, !!on);
  return { code: 0 };
}
const getRemindSetting = () => lsGet(LS.remind, true);
