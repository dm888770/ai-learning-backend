// controllers/recommend.controller.js
const recommendService = require('../services/recommend.service');
const aiService = require('../services/ai.service');
const courseRepository = require('../repositories/course.repository');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

function getUserId(req) {
  return req.user?.id || req.body?.user_id || req.query?.user_id;
}

module.exports = {
  /**
   * GET /courses/recommend - 旧版课程推荐
   */
  recommendCourses: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const data = await recommendService.recommendCoursesLegacy(userId);
    return success(res, data);
  }),

  /**
   * GET /courses/recommend/new - 新版课程推荐
   */
  getRecommendedCourses: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit) || 12;
    const data = await recommendService.getRecommendedCourses(userId, limit);
    return success(res, data);
  }),

  /**
   * POST /recommend/advice - 获取 AI 学习建议
   */
  getAIAdvice: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };

    const { weak_subjects, test_score } = req.body || {};
    const advice = await recommendService.getAIAdvice(userId, weak_subjects, test_score);
    return success(res, { advice });
  }),

  /**
   * POST /questions/personalized - 生成个性化题目
   */
  generatePersonalizedQuestions: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };

    const { count = 5, level = 'medium', subjects = [], focus_on_weakness = true } = req.body || {};
    const questions = await recommendService.generatePersonalizedQuestions(
      userId,
      parseInt(count),
      level,
      subjects,
      focus_on_weakness
    );
    return success(res, { questions });
  }),

  /**
   * POST /questions/variant/generate - AI生成变式训练题
   */
  generateVariantQuestions: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };

    const { question_id, count = 2 } = req.body || {};
    if (!question_id) {
      throw { statusCode: 400, message: '缺少 question_id' };
    }

    // 获取错题详情
    const wrongQuestions = await courseRepository.getWrongQuestions(userId, 20);
    const wrong = wrongQuestions.find(w => w.id === question_id);
    if (!wrong) {
      throw { statusCode: 404, message: '错题不存在' };
    }

    // 调用AI生成变式题
    const variants = await aiService.generateVariantQuestions(wrong, count);
    return success(res, variants);
  })
};