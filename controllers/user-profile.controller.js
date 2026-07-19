// controllers/user-profile.controller.js
const userRepository = require('../repositories/user.repository');
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
  /**
   * GET /user/profile/info - 获取用户信息
   */
  getUserInfo: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const user = await userRepository.getUserInfo(userId);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({
      code: 0,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname || user.username,
        avatar: user.avatar || '',
        email: user.email || '',
        learning_goal: user.learning_goal || '',
        knowledge_level: user.knowledge_level || 'beginner',
        bio: user.bio || '',
        join_date: formatDateShort(user.join_date),
        join_date_full: user.join_date,
        last_login_time: formatDateTime(user.last_login_time)
      }
    });
  }),

  /**
   * PUT /user/profile/info - 更新用户信息
   */
  updateUserInfo: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { nickname, avatar, learning_goal, knowledge_level, bio } = req.body;
    await userRepository.updateUserInfo(userId, {
      nickname,
      avatar,
      learning_goal,
      knowledge_level,
      bio
    });

    res.json({ code: 0, message: '更新成功' });
  }),

  /**
   * GET /user/profile/stats - 获取用户统计
   */
  getUserStats: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const stats = await userRepository.getUserStats(userId);
    res.json({
      code: 0,
      data: {
        study_days: stats.study_days || 0,
        continuous_days: stats.continuous_days || 0,
        chapters_finished: stats.chapters_finished || 0,
        total_progress: stats.total_progress || 0,
        total_score: stats.total_score || 0,
        level: stats.level || 'beginner',
        level_name: stats.level_name || '入门级',
        latest_score: stats.latest_score || 0,
        avg_score: stats.avg_score || 0
      }
    });
  }),

  /**
   * POST /user/profile/stats - 更新用户统计
   */
  updateUserStats: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { study_days, continuous_days, chapters_finished, total_progress } = req.body;
    await userRepository.updateUserStats(userId, {
      study_days,
      continuous_days,
      chapters_finished,
      total_progress
    });

    res.json({ code: 0, message: '统计更新成功' });
  }),

  /**
   * GET /user/profile/courses - 获取课程进度
   */
  getCourseProgress: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const courses = await userRepository.getCourseProgress(userId);

    res.json({
      code: 0,
      data: courses.map(c => ({
        id: c.id,
        course_id: c.course_id,
        name: c.course_name || '课程',
        icon: c.icon || '📚',
        progress: c.progress || 0,
        status: c.status || 'active',
        completed_date: c.completed_date,
        total_chapters: c.total_chapters || 0,
        completed_chapters: c.completed_chapters || 0
      }))
    });
  }),

  /**
   * POST /user/profile/courses - 更新课程进度
   */
  updateCourseProgress: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { course_id, progress, course_name, icon, status } = req.body;
    if (!course_id) {
      return res.status(400).json({ code: 400, message: '缺少 course_id 参数' });
    }

    await userRepository.updateCourseProgress(userId, course_id, {
      progress,
      course_name,
      icon,
      status
    });

    res.json({ code: 0, message: '课程进度更新成功' });
  }),

  /**
   * GET /user/profile/records - 获取学习记录
   */
  getStudyRecords: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const records = await userRepository.getStudyRecords(userId, limit);

    res.json({
      code: 0,
      data: records.map(r => ({
        id: r.id,
        date: r.record_date,
        content: r.content || '',
        duration_minutes: r.duration_minutes || 0,
        chapters_done: r.chapters_done || 0,
        problems_done: r.problems_done || 0
      }))
    });
  }),

  /**
   * POST /user/profile/records - 创建学习记录
   */
  createStudyRecord: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { record_date, content, duration_minutes, chapters_done, problems_done } = req.body;
    const id = await userRepository.createStudyRecord({
      user_id: userId,
      record_date,
      content,
      duration_minutes,
      chapters_done,
      problems_done
    });

    res.json({ code: 0, data: { id }, message: '学习记录创建成功' });
  }),

  /**
   * GET /user/profile/review - 获取学习回顾统计
   */
  getReviewStats: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { period = 'week' } = req.query;
    const stats = await userRepository.getReviewStats(userId, period);

    // 获取最近的学习记录用于展示
    const records = await userRepository.getStudyRecords(userId, 3);

    res.json({
      code: 0,
      data: {
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
      }
    });
  }),

  /**
   * GET /user/profile/calendar - 获取学习日历
   */
  getStudyCalendar: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ code: 400, message: '缺少 year 或 month 参数' });
    }

    const calendar = await userRepository.getStudyCalendar(
      userId,
      parseInt(year),
      parseInt(month)
    );

    res.json({
      code: 0,
      data: calendar.map(c => ({
        date: c.record_date,
        duration_minutes: c.duration_minutes || 0,
        chapters_done: c.chapters_done || 0,
        problems_done: c.problems_done || 0
      }))
    });
  })
};