/* ============================================================
   services/EmotionProvider.js — 策略模式抽象基类
   所有供应商必须实现 analyzeAudio(audioFile)，返回标准 EmotionResult。
   前端只依赖这个抽象，不直接接触任何具体供应商 API。
   ============================================================ */

/**
 * 情绪识别供应商抽象类
 * 子类必须实现 analyzeAudio 方法
 */
class EmotionProvider {
  /**
   * 分析音频文件，返回标准情绪结果
   * @param {Blob} audioFile - 录音产生的音频 Blob
   * @returns {Promise<EmotionResult>}
   */
  async analyzeAudio(audioFile) {
    throw new Error('EmotionProvider 子类必须实现 analyzeAudio 方法');
  }
}
