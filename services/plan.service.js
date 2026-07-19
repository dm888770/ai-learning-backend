// services/plan.service.js - 完整修复版

const profileService = require('./profile.service');
const aiService = require('./ai.service');
const courseRepository = require('../repositories/course.repository');
const testRepository = require('../repositories/test.repository');
const { safeParse } = require('../utils/json');

// 课程类型到知识点的映射
const COURSE_KNOWLEDGE_MAP = {
  'software-eng': ['软件工程概论', '需求分析', '软件设计', '软件测试', '项目管理'],
  'design': ['设计模式', '架构设计', 'UML建模', '重构'],
  'network': ['TCP/IP协议', 'HTTP协议', 'DNS', '网络安全', '分布式系统'],
  'management': ['敏捷开发', 'Scrum', '项目规划', '团队协作'],
  'security': ['网络安全', '加密认证', '漏洞分析', '安全防御'],
  'practice': ['Web开发', 'DevOps', 'CI/CD', '微服务']
};

module.exports = {
  /**
   * 生成简单版学习计划
   */
  async generateSimplePlan(userId, duration = 30) {
    const profile = await profileService.generateProfile(userId);
    const weakPoints = profile?.weak_points || ['数据结构', '计算机网络', '操作系统'];
    
    const tasks = [];
    const dailyHours = Math.ceil(duration / weakPoints.length);
    
    weakPoints.slice(0, 5).forEach((point, index) => {
      tasks.push({
        id: index + 1,
        title: `学习 ${point}`,
        description: `每天学习 ${point} 相关知识点，完成练习题`,
        days: Math.ceil(duration / weakPoints.length),
        startDay: index * dailyHours + 1,
        priority: index < 2 ? 'high' : 'normal',
        type: 'learning'
      });
    });
    
    tasks.push({
      id: tasks.length + 1,
      title: '综合复习',
      description: '回顾本周学习内容，完成综合测试',
      days: 7,
      startDay: duration - 7,
      priority: 'high',
      type: 'review'
    });

    // 保存计划到数据库
    const planData = {
      user_id: userId,
      name: `学习计划 - ${duration}天`,
      plan_type: 'manual',
      total_days: duration,
      start_date: new Date().toISOString().split('T')[0],
      daily_study_minutes: 120,
      ai_metadata: {
        tasks,
        totalTasks: tasks.length,
        duration
      },
      progress_percent: 0,
      task_total: tasks.length,
      task_done: 0
    };
    
    try {
      await courseRepository.saveLearningPlan(planData);
    } catch (error) {
      console.error('保存简单计划失败:', error.message);
    }

    return {
      userId,
      duration,
      startDate: new Date().toISOString().split('T')[0],
      totalTasks: tasks.length,
      tasks
    };
  },

  /**
   * 生成每日任务计划
   */
  async generateDailyPlan(userId, courses = [], date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // 1. 获取用户画像
    const profile = await profileService.generateProfile(userId);
    const weakPoints = profile?.weak_points || [];
    const latestScore = profile?.latest_score || 0;
    
    // 2. 获取错题列表
    const wrongQuestions = await courseRepository.getWrongQuestions(userId, 5);
    
    // 3. 构建任务列表
    const tasks = [];
    
    // 基于薄弱点生成学习任务
    if (weakPoints.length > 0) {
      const weakTopic = weakPoints[0];
      tasks.push({
        id: 1,
        time: '09:00-10:00',
        title: `📚 学习：${weakTopic}`,
        content: `学习 ${weakTopic} 基础知识`,
        type: 'learning',
        duration: 60,
        priority: 'high',
        related_weakness: weakTopic,
        completed: false
      });
    }
    
    // 基于错题生成复习任务
    if (wrongQuestions.length > 0) {
      const wrong = wrongQuestions[0];
      tasks.push({
        id: 2,
        time: '10:30-11:15',
        title: `📝 错题复习：${wrong.topic || wrong.chapter}`,
        content: `复习错题：${wrong.question?.substring(0, 30) || ''}...`,
        type: 'review',
        duration: 45,
        priority: 'high',
        wrong_id: wrong.id,
        completed: false
      });
    }
    
    // 添加综合复习任务
    tasks.push({
      id: tasks.length + 1,
      time: '14:00-15:00',
      title: '📖 综合复习',
      content: '回顾今日所学，整理笔记',
      type: 'review',
      duration: 60,
      priority: 'medium',
      completed: false
    });
    
    // 添加课程学习任务
    if (courses && courses.length > 0) {
      const course = courses[0];
      tasks.push({
        id: tasks.length + 1,
        time: '19:00-20:00',
        title: `📹 课程学习：${course.title || '推荐课程'}`,
        content: `学习 ${course.title || '推荐课程'} 视频内容`,
        type: 'video',
        duration: 60,
        priority: 'low',
        course_id: course.id,
        completed: false
      });
    }

    // 4. 生成AI建议
    let advice = '建议每天坚持学习，重点突破薄弱知识点。';
    try {
      advice = await aiService.generateAdvice(weakPoints, latestScore);
    } catch (e) {
      // 使用默认建议
    }

    // 5. 保存到数据库（适配新表结构）
    const planData = {
      user_id: userId,
      name: `${targetDate} 学习计划`,
      plan_type: 'ai',
      total_days: 30,
      start_date: targetDate,
      daily_study_minutes: 120,
      ai_metadata: {
        advice,
        weakPoints,
        latestScore,
        generatedAt: new Date().toISOString(),
        dailyTasks: tasks
      },
      progress_percent: 0,
      task_total: tasks.length,
      task_done: 0
    };
    
    try {
      const planId = await courseRepository.saveLearningPlan(planData);
      // 保存每日任务到明细表
      await courseRepository.saveDailyTasks(planId, targetDate, tasks);
    } catch (error) {
      console.error('保存学习计划失败:', error.message);
    }

    return {
      plan: {
        userId,
        date: targetDate,
        advice,
        tasks: tasks,
        totalDuration: tasks.reduce((sum, t) => sum + (t.duration || 45), 0)
      }
    };
  },

  /**
   * 获取今日学习计划
   */
  async getTodayPlan(userId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const plan = await courseRepository.getLearningPlan(userId, targetDate);
    
    if (!plan) {
      // 如果没有今日计划，自动生成
      return this.generateDailyPlan(userId, [], targetDate);
    }
    
    // 获取每日任务
    const dailyTasks = await courseRepository.getDailyTasks(plan.id, targetDate);
    let tasks = [];
    if (dailyTasks && dailyTasks.length > 0) {
      tasks = dailyTasks;
    } else {
      tasks = this._extractTasksFromMetadata(plan.ai_metadata);
    }
    
    return {
      plan: {
        userId,
        planId: plan.id,
        date: targetDate,
        name: plan.name,
        tasks: tasks,
        progress: plan.progress_percent || 0,
        status: plan.status || 0
      }
    };
  },

  /**
   * 获取本周学习计划
   */
  async getWeekPlan(userId, startDate, endDate) {
    const start = startDate || this._getWeekStart();
    const end = endDate || this._getWeekEnd();
    const plans = await courseRepository.getWeekPlans(userId, start, end);
    
    // 格式化返回
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const result = [];
    
    for (let index = 0; index < weekDays.length; index++) {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      const dateStr = date.toISOString().split('T')[0];
      
      // 查找对应日期的计划
      let plan = null;
      let tasks = [];
      
      // 在 plans 中查找匹配的计划
      for (const p of plans) {
        // 检查是否有 plan_date 字段，或者从 ai_metadata 中提取
        let planDate = p.plan_date || p.date;
        if (!planDate && p.ai_metadata) {
          try {
            const meta = typeof p.ai_metadata === 'string' ? JSON.parse(p.ai_metadata) : p.ai_metadata;
            planDate = meta.date || meta.generatedAt?.split('T')[0];
          } catch (e) {}
        }
        if (planDate === dateStr) {
          plan = p;
          break;
        }
      }
      
      // 如果有计划，提取任务
      if (plan) {
        // 尝试从明细表获取
        const dailyTasks = await courseRepository.getDailyTasks(plan.id, dateStr);
        if (dailyTasks && dailyTasks.length > 0) {
          tasks = dailyTasks;
        } else {
          tasks = this._extractTasksFromMetadata(plan.ai_metadata);
        }
      }
      
      result.push({
        name: weekDays[index],
        date: `${date.getMonth() + 1}月${date.getDate()}日`,
        dateStr: dateStr,
        tasks: tasks,
        progress: plan?.progress_percent || 0,
        status: plan?.status || 0,
        hasPlan: !!plan
      });
    }
    
    return result;
  },

  /**
   * 生成完整学习计划（基于画像+错题+测评）
   */
  async generateFullStudyPlan({
    userId,
    weakPoints = [],
    totalScore = 0,
    favoriteCourses = [],
    viewHistory = []
  }) {
    // 1. 获取用户画像
    const profile = await profileService.generateProfile(userId);
    const weaks = weakPoints.length > 0 ? weakPoints : (profile?.weak_points || []);
    const score = totalScore || profile?.total_score || 0;
    
    // 2. 获取错题
    const wrongQuestions = await courseRepository.getWrongQuestions(userId, 10);
    
    // 3. 获取阶段
    let stage = 'ENTRY';
    let stageName = '入门引导';
    if (score >= 85) {
      stage = 'FINAL';
      stageName = '总复习';
    } else if (score >= 75) {
      stage = 'SPRINT';
      stageName = '真题冲刺';
    } else if (score >= 60) {
      stage = 'STRENGTHEN';
      stageName = '强化提升';
    } else if (score >= 40) {
      stage = 'BASIC';
      stageName = '基础夯实';
    }
    
    // 4. 生成阶段任务
    const stageTasks = this._generateStageTasks(stage, weaks, wrongQuestions);
    
    // 5. 生成AI建议
    let aiAdvice = '';
    try {
      aiAdvice = await aiService.generateAdvice(weaks, score);
    } catch (e) {
      aiAdvice = `当前处于${stageName}阶段，建议按计划系统学习。重点关注：${weaks.slice(0, 3).join('、')}`;
    }
    
    // 6. 保存到数据库
    const planData = {
      user_id: userId,
      name: `${stageName}学习计划`,
      plan_type: 'ai',
      total_days: stageTasks.duration,
      start_date: new Date().toISOString().split('T')[0],
      daily_study_minutes: 120,
      ai_metadata: {
        stage,
        stageName,
        weaks,
        score,
        advice: aiAdvice,
        milestones: stageTasks.milestones,
        weeklyGoals: stageTasks.weeklyGoals,
        dailyTasks: stageTasks.dailyTasks
      },
      progress_percent: 0,
      task_total: stageTasks.dailyTasks.length,
      task_done: 0
    };
    
    try {
      await courseRepository.saveLearningPlan(planData);
    } catch (error) {
      console.error('保存完整学习计划失败:', error.message);
    }

    return {
      plan: {
        userId,
        currentStage: stage,
        stageName,
        totalScore: score,
        weakPoints: weaks,
        wrongCount: wrongQuestions.length,
        advice: aiAdvice,
        milestones: stageTasks.milestones,
        dailyTasks: stageTasks.dailyTasks,
        weeklyGoals: stageTasks.weeklyGoals,
        estimatedDuration: `${stageTasks.duration}天`
      }
    };
  },

  /**
   * 添加任务到学习计划
   */
  async addTaskToPlan(userId, planId, task) {
    // 获取当前计划
    const plan = await courseRepository.getLearningPlanById(planId);
    if (!plan) {
      throw { statusCode: 404, message: '计划不存在' };
    }
    if (plan.user_id !== parseInt(userId)) {
      throw { statusCode: 403, message: '无权修改此计划' };
    }
    
    // 从 metadata 获取现有任务
    let tasks = this._extractTasksFromMetadata(plan.ai_metadata);
    const newTask = {
      id: tasks.length + 1,
      ...task,
      completed: false,
      created_at: new Date().toISOString()
    };
    tasks.push(newTask);
    
    // 更新 metadata
    let metadata = typeof plan.ai_metadata === 'string' ? JSON.parse(plan.ai_metadata) : (plan.ai_metadata || {});
    metadata.dailyTasks = tasks;
    
    await courseRepository.updateLearningPlan(planId, {
      ai_metadata: metadata,
      task_total: tasks.length
    });
    
    return { planId, task: newTask };
  },

  /**
   * 切换任务完成状态
   */
  async toggleTaskStatus(userId, planId, taskIndex) {
    const plan = await courseRepository.getLearningPlanById(planId);
    if (!plan) {
      throw { statusCode: 404, message: '计划不存在' };
    }
    if (plan.user_id !== parseInt(userId)) {
      throw { statusCode: 403, message: '无权修改此计划' };
    }
    
    // 从 metadata 中获取任务
    let tasks = this._extractTasksFromMetadata(plan.ai_metadata);
    
    if (taskIndex < 0 || taskIndex >= tasks.length) {
      throw { statusCode: 400, message: '任务索引无效' };
    }
    
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    const completedCount = tasks.filter(t => t.completed).length;
    const progress = Math.round((completedCount / tasks.length) * 100);
    
    // 更新 metadata
    let metadata = typeof plan.ai_metadata === 'string' ? JSON.parse(plan.ai_metadata) : (plan.ai_metadata || {});
    metadata.dailyTasks = tasks;
    
    // 更新计划
    await courseRepository.updateLearningPlan(planId, {
      ai_metadata: metadata,
      progress_percent: progress,
      task_done: completedCount,
      task_total: tasks.length,
      status: progress === 100 ? 2 : (progress > 0 ? 1 : 0)
    });
    
    return { planId, taskIndex, completed: tasks[taskIndex].completed, progress };
  },

  /**
   * 更新计划进度
   */
  async updatePlanProgress(userId, planId, progress) {
    const plan = await courseRepository.getLearningPlanById(planId);
    if (!plan) {
      throw { statusCode: 404, message: '计划不存在' };
    }
    if (plan.user_id !== parseInt(userId)) {
      throw { statusCode: 403, message: '无权修改此计划' };
    }
    
    const tasks = this._extractTasksFromMetadata(plan.ai_metadata);
    const taskDone = Math.round((progress / 100) * tasks.length);
    
    await courseRepository.updateLearningPlan(planId, {
      progress_percent: progress,
      task_done: taskDone,
      status: progress === 100 ? 2 : (progress > 0 ? 1 : 0)
    });
    
    return { planId, progress, taskDone };
  },

  /**
   * 获取学习日历
   */
  async getCalendar(userId, year, month) {
    const calendar = await courseRepository.getStudyCalendar(userId, year, month);
    return calendar;
  },

  /**
   * 从 metadata 提取任务
   */
  _extractTasksFromMetadata(metadata) {
    if (!metadata) return [];
    try {
      const data = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      return data.dailyTasks || data.tasks || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * 根据阶段生成任务
   */
  _generateStageTasks(stage, weakPoints, wrongQuestions) {
    const stageConfig = {
      ENTRY: { 
        duration: 20, 
        milestones: ['了解学科框架', '掌握基本概念', '建立学习习惯'],
        focus: ['基础概念', '入门练习']
      },
      BASIC: { 
        duration: 60, 
        milestones: ['夯实基础知识', '完成章节练习', '构建知识体系'],
        focus: ['核心知识点', '章节练习']
      },
      STRENGTHEN: { 
        duration: 60, 
        milestones: ['专项突破', '大量练习', '查漏补缺'],
        focus: weakPoints.length > 0 ? weakPoints : ['算法', '数据结构']
      },
      SPRINT: { 
        duration: 50, 
        milestones: ['真题演练', '模拟测试', '考前冲刺'],
        focus: ['真题', '模拟', '高频考点']
      },
      FINAL: { 
        duration: 20, 
        milestones: ['高频考点', '易错点复习', '调整心态'],
        focus: ['高频考点', '错题回顾']
      }
    };

    const config = stageConfig[stage] || stageConfig.BASIC;
    
    // 从错题中提取知识点
    const wrongTopics = wrongQuestions.map(w => w.topic || w.chapter).filter(Boolean);
    const focusTopics = [...new Set([...config.focus, ...wrongTopics.slice(0, 3)])];
    
    const dailyTasks = focusTopics.map((topic, index) => ({
      id: index + 1,
      name: `学习 ${topic}`,
      duration: `${45 + index * 15}min`,
      completed: false,
      type: 'learning',
      priority: index < 2 ? 'high' : 'medium'
    }));
    
    // 添加错题复习任务
    if (wrongQuestions.length > 0) {
      dailyTasks.push({
        id: dailyTasks.length + 1,
        name: `错题复习 (${wrongQuestions.length}道)`,
        duration: '30min',
        completed: false,
        type: 'review',
        priority: 'high'
      });
    }

    const weeklyGoals = focusTopics.slice(0, 3).map((topic, i) => ({
      week: `第${i + 1}周`,
      focus: topic,
      target: '掌握核心知识点'
    }));

    return {
      duration: config.duration,
      milestones: config.milestones,
      dailyTasks,
      weeklyGoals
    };
  },

  /**
   * 获取本周开始日期
   */
  _getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  },

  /**
   * 获取本周结束日期
   */
  _getWeekEnd() {
    const start = new Date(this._getWeekStart());
    start.setDate(start.getDate() + 6);
    return start.toISOString().split('T')[0];
  }
};