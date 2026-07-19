// controllers/tts.controller.js
// TTS 控制器 - 预留接口，暂用前端 Web Speech API
// 后续可接入阿里云/讯飞 TTS SDK，替换 generate() 方法即可
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = {
  // POST /tts/generate - 预留接口（用于未来接入付费 TTS）
  // 当前前端直接用 Web Speech API，此接口可快速切换到后端合成
  generate: asyncHandler(async (req, res) => {
    const { text, voice } = req.body;

    if (!text) {
      throw { statusCode: 400, message: '文本不能为空' };
    }

    if (text.length > 3000) {
      throw { statusCode: 400, message: '文本不能超过3000字' };
    }

    console.log('🎤 TTS 请求（前端 Web Speech API 模式）:', text.substring(0, 50) + '...');

    // 预留：将来接入阿里云/讯飞 TTS 时，在这里调用并返回 audioUrl
    // 当前返回 fallback=true，让前端使用 Web Speech API
    return success(res, {
      audioUrl: null,
      subtitleUrl: null,
      fallback: true,
      text: text,
      voice: voice || 'zh-CN',
      message: '使用浏览器内置语音合成'
    });
  }),

  // GET /tts/voices - 返回可用的音色列表（前端 Web Speech API 用）
  getVoices: asyncHandler(async (req, res) => {
    const voices = [
      { id: 'zh-CN', name: '中文（默认）', lang: 'zh-CN' },
      { id: 'zh-CN-Xiaoxiao', name: '晓晓（女声-温柔）', lang: 'zh-CN' },
      { id: 'zh-CN-Yunxi', name: '云希（男声-阳光）', lang: 'zh-CN' },
      { id: 'zh-CN-Xiaoyi', name: '小艺（女声-活泼）', lang: 'zh-CN' },
      { id: 'zh-TW', name: '台湾话', lang: 'zh-TW' },
    ];
    return success(res, { voices });
  })
};
