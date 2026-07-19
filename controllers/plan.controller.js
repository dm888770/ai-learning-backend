// controllers/plan.controller.js
const planService = require('../services/plan.service');
const profileService = require('../services/profile.service');
const aiService = require('../services/ai.service');
const courseRepository = require('../repositories/course.repository');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

function getUserId(req) {
  return req.user?.id || req.body?.user_id || req.query?.user_id;
}

module.exports = {
  /** POST /plan/generate  简单版（基于薄弱点 + 天数） */
  generatePlan: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { duration = 30 } = req.body || {};
    const plan = await planService.generateSimplePlan(userId, duration);
    return success(res, { plan });
  }),

  /** POST /plan/generate/ai  每日任务（增强版：AI智能生成） */
  generateLearningPlanByAI: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少用户ID' };

    const { courses = [], daily_minutes = 120 } = req.body || {};

    // 1. 获取用户画像
    const profile = await profileService.generateProfile(userId);
    const weakPoints = profile?.weak_points || [];
    
    // 2. 调用AI生成计划
    const aiPlan = await aiService.generateLearningPlan(userId, profile, weakPoints, daily_minutes);
    
    // 3. 格式化任务
    const tasks = (aiPlan.dailyTasks || []).map((task, index) => ({
      id: index + 1,
      name: task.task || task.title || '学习任务',
      duration: task.duration || '45min',
      completed: false,
      type: task.type || 'learning',
      time: task.time || '09:00-10:00'
    }));

    // 4. 保存到数据库
    const today = new Date().toISOString().split('T')[0];
    const planData = {
      user_id: userId,
      date: today,
      name: `${profile?.level_name || '个性化'}学习计划 - ${today}`,
      type: 'ai_daily',
      tasks: tasks,
      progress: 0,
      status: 0
    };
    const planId = await courseRepository.saveLearningPlan(planData);

    return success(res, { 
      plan: {
        ...aiPlan,
        tasks: tasks,
        planId: planId,
        weakPoints: weakPoints
      }
    }, 'AI学习计划生成成功');
  }),

  /** POST /studyplan/generate  完整学习计划 */
  generateStudyPlan: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const {
      weak_points = [],
      total_score = 0,
      favorite_courses = [],
      view_history = []
    } = req.body || {};
    const data = await planService.generateFullStudyPlan({
      userId,
      weakPoints: weak_points,
      totalScore: total_score,
      favoriteCourses: favorite_courses,
      viewHistory: view_history
    });
    return success(res, data);
  }),

  /** GET /plan/week  获取本周学习计划 */
  getWeekPlan: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少用户ID' };
    const { start_date, end_date } = req.query;
    const data = await planService.getWeekPlan(userId, start_date, end_date);
    return success(res, data);
  }),

  /** GET /plan/today  获取今日学习计划 */
  getTodayPlan: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少用户ID' };
    const { date } = req.query;
    const data = await planService.getTodayPlan(userId, date);
    return success(res, data);
  }),

  /** POST /plan/task/add  添加任务到学习计划 */
  addTaskToPlan: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { plan_id, task } = req.body || {};
    if (!plan_id || !task) {
      throw { statusCode: 400, message: '缺少必要参数' };
    }
    const result = await planService.addTaskToPlan(userId, plan_id, task);
    return success(res, result, '任务添加成功');
  }),

  /** POST /plan/task/toggle  切换任务完成状态 */
  toggleTaskStatus: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { plan_id, task_index } = req.body || {};
    if (plan_id === undefined || task_index === undefined) {
      throw { statusCode: 400, message: '缺少必要参数' };
    }
    const result = await planService.toggleTaskStatus(userId, plan_id, task_index);
    return success(res, result, '任务状态已更新');
  }),

  /** POST /plan/update  更新计划进度 */
  updatePlanProgress: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { plan_id, progress } = req.body || {};
    if (!plan_id || progress === undefined) {
      throw { statusCode: 400, message: '缺少必要参数' };
    }
    const result = await planService.updatePlanProgress(userId, plan_id, progress);
    return success(res, result, '进度更新成功');
  }),

  /** GET /plan/calendar  获取学习日历 */
  getCalendar: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少用户ID' };
    const { year, month } = req.query;
    const data = await planService.getCalendar(userId, parseInt(year), parseInt(month));
    return success(res, data);
  })
};