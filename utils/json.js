/**
 * JSON 安全解析工具
 */

/**
 * 安全解析 JSON 字符串
 * @param {string} str 待解析字符串
 * @param {*} defaultValue 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 */
function safeParse(str, defaultValue = null) {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * 安全序列化对象为 JSON 字符串
 * @param {*} obj 待序列化对象
 * @param {string} defaultValue 序列化失败时的默认值
 * @returns {string} JSON 字符串
 */
function safeStringify(obj, defaultValue = '{}') {
  if (obj === undefined || obj === null) return defaultValue;
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return defaultValue;
  }
}

module.exports = {
  safeParse,
  safeStringify
};
