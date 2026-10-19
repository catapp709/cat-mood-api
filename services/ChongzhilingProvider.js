/* ============================================================
   services/ChongzhilingProvider.js — 宠智灵策略实现（备份模块，暂不启用）
   走服务端代理：前端把 wav 的 base64 发到 /api/detect，
   由 server.js 持有 CHONGZHILING_TOKEN 转发到宠智灵。
   前端不再接触任何密钥。
   ============================================================ */

class ChongzhilingProvider extends EmotionProvider {
  constructor() {
    super();
    this.name = 'chongzhiling';
  }

  async analyzeAudio(audioFile) {
    /* 宠智灵不支持 webm，必须先转 wav（复用 api.js 的 webmToWav） */
    let uploadBlob = audioFile;
    try {
      uploadBlob = await webmToWav(audioFile);
    } catch {
      /* 转换失败则用原始 blob，交给后端判定 */
      uploadBlob = audioFile;
    }

    const base64 = await blobToBase64(uploadBlob);

    let resp;
    try {
      resp = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          provider: 'chongzhiling'
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
