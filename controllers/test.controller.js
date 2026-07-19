// controllers/test.controller.js - 完整版
const testRepository = require('../repositories/test.repository');
const profileService = require('../services/profile.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { safeStringify, safeParse } = require('../utils/json');

function getUserId(req) {
  return req.user?.id || req.body?.user_id || req.query?.user_id;
}

module.exports = {
  submitTest: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };

    const {
      test_type = 'knowledge',
      user_score,
      total_score = 100,
      accuracy,
      knowledge_detail = {},
      weak_subjects_json,
      duration_seconds = 0
    } = req.body || {};

    if (user_score === undefined) {
      throw { statusCode: 400, message: '缺少 user_score 参数' };
    }

    const test = await testRepository.create({
      userId,
      testType: test_type,
      userScore: user_score,
      totalScore: total_score,
      accuracy: accuracy !== undefined ? accuracy : (user_score / total_score),
      durationSeconds: duration_seconds,
      knowledgeDetail: knowledge_detail,
      weakSubjectsJson: weak_subjects_json || safeStringify(knowledge_detail)
    });

    const profile = await profileService.generateProfile(userId);

    return success(res, { test, profile }, '测评提交成功');
  }),

  // 🔧 补充 getTestHistory
  getTestHistory: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };

    const { test_type } = req.query || {};
    const testTypes = test_type ? [test_type] : [];

    const history = await testRepository.findHistory(userId, testTypes);
    
    const formatted = history.map(row => ({
      id: row.id,
      test_type: row.test_type,
      user_score: row.user_score,
      total_score: row.total_score,
      accuracy: row.accuracy,
      duration_seconds: row.duration_seconds,
      knowledge_detail: safeParse(row.knowledge_detail, {}),
      test_time: row.test_time
    }));

    return success(res, formatted);
  }),

  // 🔧 补充 getLatestTest
  getLatestTest: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };

    const { test_type } = req.query || {};
    const testTypes = test_type ? [test_type] : [];

    const latest = await testRepository.findLatest(userId, testTypes);

    if (!latest) {
      return success(res, null, '暂无测评记录');
    }

    return success(res, {
      id: latest.id,
      test_type: latest.test_type,
      user_score: latest.user_score,
      total_score: latest.total_score,
      accuracy: latest.accuracy,
      duration_seconds: latest.duration_seconds,
      knowledge_detail: safeParse(latest.knowledge_detail, {}),
      test_time: latest.test_time
    });
  })
};