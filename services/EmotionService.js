/* ============================================================
   services/EmotionService.js — 策略模式统一出口（前端唯一入口）
   职责：
   1. 根据 window.__APP_CONFIG__.AI_PROVIDER 选择具体供应商
   2. 调用供应商 analyzeAudio，返回标准 EmotionResult
   3. 未配置 / 调用失败时返回 Mock 数据，保证前端永不白屏
   ============================================================ */

/**
 * Mock 供应商：环境变量未配置或所有真实供应商失败时使用
 */
class MockProvider extends EmotionProvider {
  constructor() { super(); this.name = 'mock'; }
  async analyzeAudio(audioFile) {
    /* 简单随机一个情绪，模拟兜底 */
    const moods = ['平静', '开心', '撒娇', '想玩', '饥饿', '放松'];
    const emotion = moods[Math.floor(Math.random() * moods.length)];
    const confidence = 60 + Math.floor(Math.random() * 30);
    return normalizeEmotionResult({
      emotion,
      confidence,
      translation: '（模拟数据）当前未配置真实识别服务，已返回兜底结果。请在 .env 中配置 AI_PROVIDER 及对应 API Key。'
    }, this.name);
  }
}

const EmotionService = {
  /**
   * 统一情绪识别入口
   * @param {Blob} audioFile - 录音产生的音频 Blob
   * @returns {Promise<EmotionResult>} 永远不会 reject，失败时返回 mock
   */
  async analyzeAudio(audioFile) {
    const provider = this._getProvider();
    try {
      const result = await provider.analyzeAudio(audioFile);
      /* 再做一次 normalize，确保字段完整 */
      return normalizeEmotionResult(result, result.provider || provider.name);
    } catch (err) {
      console.error('[EmotionService] 识别失败，启用 Mock 兜底：', err.message || err);
      const mock = await new MockProvider().analyzeAudio(audioFile);
      /* 保留失败原因供调试 */
      mock._error = err.message || String(err);
      return mock;
    }
  },

  /**
   * 根据环境变量选择供应商实例
   * 支持 AI_PROVIDER 和 EXPO_PUBLIC_AI_PROVIDER 两种命名
   */
  _getProvider() {
    const cfg = window.__APP_CONFIG__ || {};
    const name = (cfg.AI_PROVIDER || cfg.EXPO_PUBLIC_AI_PROVIDER || '').toLowerCase();
    switch (name) {
      case 'aliyun':
        return new AliyunProvider();
      case 'chongzhiling':
      case 'czl':
        return new ChongzhilingProvider();
      case 'mock':
      default:
        return new MockProvider();
    }
  }
};
