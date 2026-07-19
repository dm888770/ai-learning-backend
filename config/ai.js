const OpenAI = require('openai');
require('dotenv').config();

/**
 * 智谱 AI 客户端统一封装
 * 所有 AI 相关调用都通过这个 client
 */
const client = new OpenAI({
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
});

// 默认模型
const DEFAULT_MODEL = process.env.ZHIPU_MODEL || 'glm-4-flash';

if (!process.env.ZHIPU_API_KEY) {
  console.warn('⚠️  未配置 ZHIPU_API_KEY 环境变量，AI 相关功能将不可用');
}

module.exports = {
  client,
  DEFAULT_MODEL
};
