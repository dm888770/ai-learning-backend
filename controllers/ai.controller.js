// controllers/ai.controller.js - 完整版

const aiService = require('../services/ai.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

const MODE_PROMPTS = {
  1: '你是一个专业的学习助手，请用友好、详细的语气回答学生的任何学习问题。',
  2: '你是一个专业的知识点讲解老师，请详细、系统地讲解学生问到的知识点。',
  3: '你是一个作业辅导老师，请耐心地帮助学生解决作业中的难题，给出解题思路。',
  4: '你是一个题目解析专家，请详细分析题目，给出解题步骤和答案。',
  5: '你是一个学习规划专家，请根据学生情况制定个性化的学习计划和路线。',
  6: '你是一个错题分析专家，请帮助学生分析错题原因，给出改进建议。'
};

/**
 * AI 对话相关 Controller
 */
module.exports = {
  /** POST /ai/chat  通用 AI 对话 */
  aiChat: asyncHandler(async (req, res) => {
    const { question, messages, mode = 1, system_prompt } = req.body || {};

    let chatMessages;
    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages;
      if (system_prompt) {
        chatMessages = [{ role: 'system', content: system_prompt }, ...chatMessages];
      }
    } else if (question) {
      const sysPrompt = system_prompt || MODE_PROMPTS[mode] || MODE_PROMPTS[1];
      chatMessages = [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: question }
      ];
    } else {
      throw { statusCode: 400, message: '问题不能为空' };
    }

    try {
      const answer = await aiService.chat(chatMessages, { temperature: 0.8, maxTokens: 2000 });
      return success(res, { answer });
    } catch (e) {
      console.error('AI 对话失败:', e.message);
      return success(res, { answer: '抱歉，AI服务暂时不可用，请稍后再试。' });
    }
  }),

  /** POST /questions/generate  通用题目生成 */
  generateQuestions: asyncHandler(async (req, res) => {
    const { user_id, topic, subject_name, count = 5, level = '中等' } = req.body || {};

    let realTopic = topic || subject_name || '计算机基础';
    if (!topic && !subject_name && user_id) {
      try {
        const profileService = require('../services/profile.service');
        const profile = await profileService.getUserProfile(user_id);
        if (profile && profile.weakPoints && profile.weakPoints.length) {
          realTopic = profile.weakPoints.join('、');
        }
      } catch (_) {}
    }

    try {
      const questions = await aiService.generateQuestions(realTopic, count, level);
      return success(res, questions);
    } catch (e) {
      console.error('AI 题目生成失败:', e.message);
      return success(res, []);
    }
  }),

  /** 🔧 新增：POST /ai/stage-quiz/generate - 生成阶段小测试 */
  generateStageQuiz: asyncHandler(async (req, res) => {
    const { stage_name, stage_index, weak_points = [], count = 5 } = req.body || {};
    
    if (!stage_name) {
      throw { statusCode: 400, message: '缺少阶段名称' };
    }

    // 构建测试主题
    const topic = `${stage_name} 核心知识点`;
    const difficulty = stage_index === 0 ? '入门' : (stage_index === 1 ? '中等' : '较难');
    
    try {
      // 尝试使用AI生成题目
      const questions = await aiService.generateStageQuiz(topic, difficulty, count, weak_points);
      return success(res, { questions });
    } catch (e) {
      console.error('AI生成阶段测试失败:', e.message);
      // 降级到本地题库
      const questions = aiService._getLocalStageQuestions(stage_name, count);
      return success(res, { questions });
    }
  }),

  /** POST /ai/mindmap/generate - 生成思维导图 */
  generateMindmap: asyncHandler(async (req, res) => {
    const { topic, questions } = req.body || {};

    if (!topic || !questions || !Array.isArray(questions)) {
      throw { statusCode: 400, message: '缺少主题或题目列表' };
    }

    try {
      const mindmapData = await aiService.generateMindmap(topic, questions);
      if (mindmapData) {
        return success(res, mindmapData);
      } else {
        return success(res, null);
      }
    } catch (e) {
      console.error('AI生成思维导图失败:', e.message);
      return success(res, null);
    }
  }),

  /** POST /ai/voice-analysis  AI 分析语音/文字描述的学习目标 */
  analyzeVoice: asyncHandler(async (req, res) => {
    const { text } = req.body || {};
    if (!text) throw { statusCode: 400, message: '文本内容不能为空' };

    try {
      const analysis = await aiService.chat(
        [
          {
            role: 'system',
            content: '你是一个专业的计算机学习分析师。根据学生描述的学习目标和兴趣，分析其学习需求，给出精准的学习建议和路线规划。回复要求简洁具体，100字以内，直接给出建议，不需要重复学生的描述。'
          },
          {
            role: 'user',
            content: `我的学习目标和兴趣描述：${text}\n\n请分析我的学习需求，给出具体的学习建议和方法路线。`
          }
        ],
        { temperature: 0.7, maxTokens: 500 }
      );
      return success(res, { analysis });
    } catch (e) {
      console.error('AI 语音分析失败:', e.message);
      const fallback = _fallbackVoiceAnalysis(text);
      return success(res, { analysis: fallback });
    }
  })
};

/**
 * 降级分析：基于关键词的简单匹配
 */
function _fallbackVoiceAnalysis(text) {
  if (text.includes('链表') || text.includes('线性') || text.includes('栈') || text.includes('队列')) {
    return '检测到你关注数据结构，建议从链表操作入手，逐步掌握栈、队列、树和图。';
  }
  if (text.includes('树') || text.includes('二叉') || text.includes('图')) {
    return '推荐路线：二叉树遍历 → BST → AVL → 红黑树 → 图论算法。';
  }
  if (text.includes('排序') || text.includes('快排') || text.includes('算法')) {
    return '推荐排序路线：冒泡 → 快排 → 归并 → 堆排序，对比时间空间复杂度。';
  }
  if (text.includes('机器学习') || text.includes('ML') || text.includes('分类') || text.includes('回归')) {
    return '建议路线：线性回归 → 逻辑回归 → SVM → 决策树 → 集成学习。';
  }
  if (text.includes('深度学习') || text.includes('神经网络') || text.includes('CNN') || text.includes('RNN')) {
    return '推荐路线：感知机 → BP → CNN → RNN/LSTM → Transformer。';
  }
  if (text.includes('计算机组成') || text.includes('CPU') || text.includes('指令')) {
    return '建议路线：数据表示 → 指令系统 → CPU设计 → 流水线 → 存储系统。';
  }
  if (text.includes('操作系统') || text.includes('进程') || text.includes('内存管理')) {
    return '推荐路线：进程管理 → 内存管理 → 文件系统 → I/O系统。';
  }
  if (text.includes('软件工程') || text.includes('设计模式') || text.includes('测试')) {
    return '推荐路线：需求分析 → 设计模式 → 编码规范 → 软件测试。';
  }
  if (text.includes('网络') || text.includes('TCP') || text.includes('HTTP')) {
    return '推荐路线：物理层 → 数据链路层 → 网络层 → 传输层 → 应用层。';
  }
  return '根据你的描述，建议从四门核心课程中选择薄弱方向系统学习，每日练习3道以上相关题目。';
}