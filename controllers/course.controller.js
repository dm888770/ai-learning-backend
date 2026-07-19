// controllers/course.controller.js
const courseRepository = require('../repositories/course.repository');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

function getUserId(req) {
  return req.user?.id || req.body?.user_id || req.query?.user_id;
}

module.exports = {
  /**
   * GET /courses/list - 获取所有课程
   */
  getCourseList: asyncHandler(async (req, res) => {
    const { category, type, keyword } = req.query;
    let courses = [];

    if (keyword) {
      courses = await courseRepository.search(keyword);
    } else if (category) {
      courses = await courseRepository.findByCategory(parseInt(category));
    } else if (type) {
      courses = await courseRepository.findByType(type);
    } else {
      courses = await courseRepository.findAll();
    }

    // 如果用户已登录，获取进度信息
    const userId = getUserId(req);
    if (userId && userId > 0) {
      const progressList = await courseRepository.getUserAllProgress(userId);
      const progressMap = {};
      progressList.forEach(p => {
        progressMap[p.course_id] = { progress: p.progress, is_favorite: p.is_favorite };
      });
      courses = courses.map(c => ({
        ...c,
        progress: progressMap[c.id]?.progress || 0,
        is_favorite: progressMap[c.id]?.is_favorite || false
      }));
    } else {
      courses = courses.map(c => ({ ...c, progress: 0, is_favorite: false }));
    }

    return success(res, courses);
  }),

  /**
   * GET /courses/detail/:id - 获取课程详情
   */
  getCourseDetail: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = getUserId(req);
    
    const course = await courseRepository.findById(id);
    if (!course) {
      throw { statusCode: 404, message: '课程不存在' };
    }

    // 增加浏览量
    await courseRepository.incrementViewCount(id);

    let progress = 0;
    let isFavorite = false;
    if (userId && userId > 0) {
      const userProgress = await courseRepository.getUserProgress(userId, id);
      if (userProgress) {
        progress = userProgress.progress;
        isFavorite = userProgress.is_favorite === 1;
      }
    }

    return success(res, { ...course, progress, is_favorite });
  }),

  /**
   * GET /courses/categories - 获取分类列表
   */
  getCategories: asyncHandler(async (req, res) => {
    const categories = await courseRepository.getCategories();
    return success(res, categories);
  }),

  /**
   * GET /courses/recommended - 获取推荐课程
   */
  getRecommended: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const courses = await courseRepository.findRecommended(limit);
    return success(res, courses);
  }),

  /**
   * GET /courses/hot - 获取热门课程
   */
  getHotCourses: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const courses = await courseRepository.findHot(limit);
    return success(res, courses);
  }),

  /**
   * POST /courses/progress - 更新课程进度
   */
  updateProgress: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const { course_id, progress } = req.body;
    if (!course_id || progress === undefined) {
      throw { statusCode: 400, message: '缺少必要参数' };
    }

    await courseRepository.updateProgress(userId, course_id, Math.min(100, Math.max(0, progress)));
    return success(res, null, '进度更新成功');
  }),

  /**
   * POST /courses/favorite/toggle - 切换收藏
   */
  toggleFavorite: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const { course_id } = req.body;
    if (!course_id) throw { statusCode: 400, message: '缺少course_id' };

    const isFavorite = await courseRepository.toggleFavorite(userId, course_id);
    return success(res, { isFavorite }, isFavorite ? '收藏成功' : '已取消收藏');
  }),

  /**
   * GET /courses/favorites - 获取收藏列表
   */
  getFavorites: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const courses = await courseRepository.getUserFavorites(userId);
    return success(res, courses);
  }),

  /**
   * GET /courses/progress - 获取用户所有课程进度
   */
  getUserProgress: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const progress = await courseRepository.getUserAllProgress(userId);
    return success(res, progress);
  }),

  /**
   * POST /courses/wrong/add - 添加错题
   */
  addWrongQuestion: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const { course_id, chapter, topic, question, correct_answer, user_answer } = req.body;
    if (!question || !correct_answer) {
      throw { statusCode: 400, message: '缺少必要参数' };
    }

    const id = await courseRepository.addWrongQuestion({
      user_id: userId,
      course_id: course_id || null,
      chapter,
      topic,
      question,
      correct_answer,
      user_answer
    });
    return success(res, { id }, '错题已记录');
  }),

  /**
   * GET /courses/wrong/list - 获取错题列表
   */
  getWrongQuestions: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const limit = parseInt(req.query.limit) || 10;
    const questions = await courseRepository.getWrongQuestions(userId, limit);
    return success(res, questions);
  }),

  /**
   * POST /courses/wrong/mastered - 标记错题为已掌握
   */
  markMastered: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const { id } = req.body;
    if (!id) throw { statusCode: 400, message: '缺少id' };

    await courseRepository.markMastered(id);
    return success(res, null, '已标记为掌握');
  }),
// DELETE /courses/wrong/delete
deleteWrongQuestion: asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  if (!userId) throw { statusCode: 401, message: '请先登录' }
  const { id } = req.body
  if (!id) throw { statusCode: 400, message: '缺少id' }
  await courseRepository.deleteWrongQuestion(id)
  return success(res, null, '删除成功')
}),
  /**
   * POST /courses/plan/save - 保存学习计划
   */
  saveLearningPlan: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const { date, tasks, name, type } = req.body;
    if (!date || !tasks) {
      throw { statusCode: 400, message: '缺少必要参数' };
    }

    const id = await courseRepository.saveLearningPlan({
      user_id: userId,
      date,
      tasks,
      name: name || '学习计划',
      type: type || 'daily',
      progress: 0,
      status: 0
    });
    return success(res, { id }, '学习计划已保存');
  }),

  /**
   * GET /courses/plan/day - 获取某天学习计划
   */
  getDayPlan: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const { date } = req.query;
    if (!date) throw { statusCode: 400, message: '缺少date参数' };

    const plan = await courseRepository.getLearningPlan(userId, date);
    return success(res, plan);
  }),

  /**
   * GET /courses/plan/week - 获取本周学习计划
   */
  getWeekPlans: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      throw { statusCode: 400, message: '缺少日期参数' };
    }

    const plans = await courseRepository.getWeekPlans(userId, start_date, end_date);
    return success(res, plans);
  }),

  /**
   * GET /courses/calendar - 获取学习日历
   */
  getCalendar: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 401, message: '请先登录' };

    const { year, month } = req.query;
    if (!year || !month) {
      throw { statusCode: 400, message: '缺少年月参数' };
    }

    const calendar = await courseRepository.getStudyCalendar(userId, parseInt(year), parseInt(month));
    return success(res, calendar);
  }),

  /**
   * GET /courses/search - 搜索课程
   */
  searchCourses: asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return success(res, []);
    }
    const courses = await courseRepository.search(q);
    return success(res, courses);
  })
};