// controllers/user.controller.js - 完整修复版
const userService = require('../services/user.service');
const profileService = require('../services/profile.service');
const profileRepository = require('../repositories/profile.repository');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

function getUserId(req) {
  return req.user?.id || req.body?.user_id || req.query?.user_id;
}

// ========== 辅助函数 ==========
function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = {
  // ========== 兴趣标签 ==========
  saveInterestTags: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };
    const result = await userService.saveInterestTags(userId, req.body?.tags || []);
    return success(res, result, '兴趣标签保存成功');
  }),

  batchSaveTags: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };
    const result = await userService.batchSaveTags(userId, req.body?.tags || []);
    return success(res, result, '兴趣标签保存成功');
  }),

  getInterestTags: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return success(res, []);
    const tags = await userService.getInterestTags(userId);
    return success(res, tags);
  }),

  getInterestTagsDetailed: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return success(res, { simple: [], detailed: [] });
    const data = await userService.getInterestTagsDetailed(userId);
    return success(res, data);
  }),

  updateTagWeight: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };
    const { label_name, increment = 0.1 } = req.body || {};
    await userService.updateTagWeight(userId, label_name, increment);
    return success(res, null, '标签权重更新成功');
  }),

  deleteTag: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };
    const { label_name } = req.body || {};
    await userService.deleteTag(userId, label_name);
    return success(res, null, '标签删除成功');
  }),

  // ========== 语音 ==========
  saveVoiceAnalysis: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };
    const { voice_text, voice_analysis } = req.body || {};
    await userService.saveVoiceAnalysis(userId, voice_text, voice_analysis);
    return success(res, null, '语音分析保存成功');
  }),

  getVoiceAnalysis: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return success(res, null);
    const data = await userService.getVoiceAnalysis(userId);
    return success(res, data);
  }),

  // ========== 扫描 ==========
  saveScanResult: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };
    const { scan_items, scan_recommendation } = req.body || {};
    await userService.saveScanResult(userId, scan_items, scan_recommendation);
    return success(res, null, '扫描结果保存成功');
  }),

  getScanResult: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return success(res, null);
    const data = await userService.getScanResult(userId);
    return success(res, data);
  }),

  // ========== 画像 ==========
  generateUserProfile: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };
    const data = await profileService.generateProfile(userId);
    return success(res, data, '画像生成成功');
  }),

  getFullProfile: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return success(res, { profile: null, interests: [], voice: null, scan: null, lastTest: null, testHistory: [] });
    const data = await profileService.getFullProfile(userId);
    return success(res, data);
  }),

  getEnhancedProfile: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, {
        profile: null,
        weakPoints: [],
        dimensionScores: [40, 40, 40, 40, 40, 40],
        recentTests: [],
        trend: 'stable',
        trendPercent: 0,
        totalTests: 0,
        avgScore: 0,
        latestScore: 0
      });
    }
    const data = await profileService.getEnhancedProfile(userId);
    return success(res, data);
  }),

  getWeakPointsAnalysis: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return success(res, { weakPoints: [], analysis: [] });
    const data = await profileService.getWeakPointsAnalysis(userId);
    return success(res, data);
  }),

  forceUpdateProfile: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };
    const data = await profileService.generateProfile(userId);
    return success(res, data, '画像更新成功');
  }),

  getUserProfile: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return success(res, null);
    const data = await profileService.getUserProfile(userId);
    return success(res, data);
  }),

  getLearningReport: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, {
        summary: { totalTests: 0, avgScore: 0, latestScore: 0, weakPointsCount: 0, strongPointsCount: 0, interestTagsCount: 0 },
        weakPoints: [], strongPoints: [], interestTags: [], recentTests: [],
        recommendation: '完成测评后获取个性化学习报告',
        generateTime: new Date().toISOString()
      });
    }
    const data = await profileService.getLearningReport(userId);
    return success(res, data);
  }),

  // ============================================================
  // ========== 个人中心新增方法 ==========
  // ============================================================

  /**
   * GET /user/profile/info - 获取用户基本信息
   * 修复：当 nickname 为空时使用 username
   */
  getUserInfo: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const user = await profileRepository.getUserInfo(userId);
    if (!user) {
      return success(res, null, '用户不存在', 404);
    }

    return success(res, {
      id: user.id,
      username: user.username,
      nickname: user.nickname || user.username || '用户',
      avatar: user.avatar || '',
      email: user.email || '',
      bio: user.bio || '',
      learning_goal: user.learning_goal || '',
      knowledge_level: user.knowledge_level || 'beginner',
      join_date: formatDateShort(user.join_date),
      join_date_full: user.join_date,
      last_login_time: formatDateTime(user.last_login_time)
    });
  }),

  /**
   * PUT /user/profile/info - 更新用户基本信息
   */
  updateUserInfo: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const { nickname, avatar, bio, learning_goal, knowledge_level } = req.body;
    await profileRepository.updateUserInfo(userId, {
      nickname,
      avatar,
      bio,
      learning_goal,
      knowledge_level
    });

    return success(res, null, '更新成功');
  }),

  /**
   * GET /user/profile/stats - 获取用户统计
   */
  getUserStats: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const stats = await profileRepository.getUserStats(userId);
    return success(res, {
      study_days: stats.study_days || 0,
      continuous_days: stats.continuous_days || 0,
      chapters_finished: stats.chapters_finished || 0,
      total_progress: stats.total_progress || 0,
      total_score: stats.total_score || 0,
      level: stats.level || 'beginner',
      level_name: stats.level_name || '入门级',
      latest_score: stats.latest_score || 0,
      avg_score: stats.avg_score || 0
    });
  }),

  /**
   * POST /user/profile/stats - 更新用户统计
   */
  updateUserStats: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const { study_days, continuous_days, chapters_finished, total_progress } = req.body;
    await profileRepository.updateUserStats(userId, {
      study_days,
      continuous_days,
      chapters_finished,
      total_progress
    });

    return success(res, null, '统计更新成功');
  }),

  /**
   * GET /user/profile/milestones - 获取里程碑
   */
  getMilestones: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const milestones = await profileRepository.getMilestones(userId);
    return success(res, milestones.map(m => ({
      date: formatDateTime(m.milestone_date),
      title: m.title,
      content: m.content || '',
      icon: m.icon || '🎯',
      category: m.category || 'learning',
      is_unlocked: m.is_unlocked === 1
    })));
  }),

  /**
   * GET /user/profile/achievements - 获取成就
   */
  getAchievements: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const [allDefs, userAchs] = await Promise.all([
      profileRepository.getAllAchievementDefs(),
      profileRepository.getUserAchievements(userId)
    ]);

    const map = {};
    userAchs.forEach(a => { map[a.achievement_id] = a; });

    const result = allDefs.map(def => ({
      id: def.id,
      name: def.name,
      icon: def.icon || '🏆',
      desc: def.description || '',
      unlocked: !!(map[def.id] && map[def.id].is_unlocked === 1),
      progress: map[def.id]?.progress || 0
    }));

    return success(res, {
      list: result,
      unlocked_count: result.filter(a => a.unlocked).length,
      total: result.length
    });
  }),

  /**
   * GET /user/profile/records - 获取学习记录
   */
  getStudyRecords: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const limit = parseInt(req.query.limit) || 10;
    const records = await profileRepository.getStudyRecords(userId, limit);

    return success(res, records.map(r => ({
      id: r.id,
      date: r.record_date,
      content: r.content || '',
      duration_minutes: r.duration_minutes || 0,
      chapters_done: r.chapters_done || 0,
      problems_done: r.problems_done || 0
    })));
  }),

  /**
   * GET /user/profile/review - 获取学习回顾
   */
  getReviewStats: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const period = req.query.period || 'week';
    const stats = await profileRepository.getReviewStats(userId, period);
    const records = await profileRepository.getStudyRecords(userId, 3);

    return success(res, {
      stats: {
        total_minutes: stats.total_minutes || 0,
        record_count: stats.record_count || 0,
        total_chapters: stats.total_chapters || 0,
        total_problems: stats.total_problems || 0
      },
      records: records.map(r => ({
        date: r.record_date,
        content: r.content || ''
      }))
    });
  }),

  /**
   * GET /user/profile/full - 获取完整个人中心数据
   */
  getFullProfileData: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const data = await profileRepository.getFullProfile(userId);

    const user = data.user || {};
    const userData = {
      id: userId,
      username: user.username || '',
      nickname: user.nickname || user.username || '用户',
      avatar: user.avatar || '',
      join_date: formatDateShort(user.join_date || new Date())
    };

    return success(res, {
      user: userData,
      stats: {
        study_days: data.stats?.study_days || 0,
        continuous_days: data.stats?.continuous_days || 0,
        chapters_finished: data.stats?.chapters_finished || 0,
        total_progress: data.stats?.total_progress || 0,
        total_score: data.stats?.total_score || 0,
        level: data.stats?.level || 'beginner',
        level_name: data.stats?.level_name || '入门级'
      },
      milestones: (data.milestones || []).map(m => ({
        date: formatDateTime(m.milestone_date),
        title: m.title,
        content: m.content || '',
        icon: m.icon || '🎯'
      })),
      achievements: data.achievements || [],
      recent_records: (data.records || []).slice(0, 3).map(r => ({
        date: r.record_date,
        content: r.content || '',
        duration_minutes: r.duration_minutes || 0
      }))
    });
  }),

  /**
   * GET /user/profile/courses - 获取课程进度
   */
  getCourseProgress: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const courses = await profileRepository.getCourseProgress(userId);

    return success(res, courses.map(c => ({
      id: c.id,
      course_id: c.course_id,
      name: c.course_name || '课程',
      icon: c.icon || '📚',
      progress: c.progress || 0,
      status: c.status || 'active',
      completed_date: c.completed_date,
      total_chapters: c.total_chapters || 0,
      completed_chapters: c.completed_chapters || 0
    })));
  }),

  /**
   * POST /user/profile/courses - 更新课程进度
   */
  updateCourseProgress: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return success(res, null, '请先登录', 401);
    }

    const { course_id, progress, course_name, icon, status } = req.body;
    if (!course_id) {
      return success(res, null, '缺少 course_id 参数', 400);
    }

    await profileRepository.updateCourseProgress(userId, course_id, {
      progress,
      course_name,
      icon,
      status
    });

    return success(res, null, '课程进度更新成功');
  })
};