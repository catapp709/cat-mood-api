/* ============================================================
   types/index.js — 标准数据契约（Strategy Pattern 的统一出口格式）
   无论底层用哪个供应商（阿里云 / 宠智灵 / mock），前端只接收 EmotionResult。
   ============================================================ */

/**
 * 情绪识别标准结果
 * @typedef {Object} EmotionResult
 * @property {string} emotion      - 情绪标签（如：开心、生气、撒娇、恐惧）
 * @property {number} confidence   - 置信度（0-100 整数）
 * @property {string} translation  - 翻译或解释（供应商未返回时由代码兜底生成）
 * @property {string} provider     - 数据来源：'aliyun' | 'chongzhiling' | 'mock'
 */

/**
 * 兜底情绪→颜色映射（UI 层用，契约本身不包含颜色）
 * 情绪标签若不在此表，用灰色兜底
 */
const EMOTION_COLORS = {
  '开心':   '#F5A623',
  '兴奋':   '#FF6F00',
  '撒娇':   '#FF69B4',
  '亲昵':   '#FF69B4',
  '平静':   '#7ED321',
  '满足':   '#7ED321',
  '放松':   '#7ED321',
  '难过':   '#4A90D9',
  '悲伤':   '#4A90D9',
  '生气':   '#D0021B',
  '愤怒':   '#D0021B',
  '烦躁':   '#E67E22',
  '焦虑':   '#D0021B',
  '恐惧':   '#8E44AD',
  '害怕':   '#8E44AD',
  '警戒':   '#8E44AD',
  '饥饿':   '#E0A03E',
  '想玩':   '#7C6BE8',
  '未知':   '#888888'
};

/**
 * 根据情绪标签取颜色（不在映射表则返回灰色）
 * @param {string} emotion
 * @returns {string} hex 颜色
 */
function colorOfEmotion(emotion) {
  if (!emotion) return '#888888';
  return EMOTION_COLORS[emotion] || '#888888';
}

/**
 * 标准化任意供应商结果为 EmotionResult（防御性处理，保证字段完整）
 * @param {Partial<EmotionResult>} raw
 * @param {string} providerName
 * @returns {EmotionResult}
 */
function normalizeEmotionResult(raw, providerName) {
  const emotion = (raw && raw.emotion) ? String(raw.emotion).trim() : '未知';
  let confidence = Number(raw && raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));
  const translation = (raw && raw.translation) ? String(raw.translation).trim() : '';
  return {
    emotion,
    confidence,
    translation: translation || `识别为「${emotion}」，置信度 ${confidence}%`,
    provider: providerName
  };
}
