/* ============================================================
   services/AliyunProvider.js — 阿里云 Qwen-Audio 策略实现
   走服务端代理：前端只把音频 base64 发到 /api/detect，
   由 server.js 持有 DASHSCOPE_API_KEY 转发到阿里云。
   前端不再接触任何密钥。
   ============================================================ */

class AliyunProvider extends EmotionProvider {
  constructor() {
    super();
    this.name = 'aliyun';
  }

  async analyzeAudio(audioFile) {
    /* 阿里云接受 base64 Data URL，webm 可直接上传，无需 wav 转换 */
    const base64 = await blobToBase64(audioFile);
    const cfg = window.__APP_CONFIG__ || {};
    const prompt = cfg.ALIYUN_PROMPT || '';

    let resp;
    try {
      resp = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          audioType: audioFile.type || '',
          prompt,
          provider: 'aliyun'
        })
      });
    } catch {
      throw new Error('无法连接本地识别代理服务');
    }

    let json;
    try { json = await resp.json(); } catch { throw new Error('代理服务返回了无法解析的响应'); }

    if (json.code !== 0) throw new Error(json.message || '识别失败');
    return normalizeEmotionResult(json.data, this.name);
  }
}
