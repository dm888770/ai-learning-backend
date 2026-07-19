/**
 * 向量相似度计算
 */

/**
 * 余弦相似度
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} 范围 [-1, 1]
 */
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const minLen = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < minLen; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  if (!normA || !normB) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 把字符串数组转成 one-hot 向量（基于参考词表）
 * @param {string[]} tokens 当前 tokens
 * @param {string[]} vocab 词表
 */
function toOneHot(tokens, vocab) {
  return vocab.map(t => (tokens.includes(t) ? 1 : 0));
}

module.exports = { cosineSimilarity, toOneHot };
