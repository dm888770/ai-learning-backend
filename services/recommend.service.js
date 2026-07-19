const courseRepository = require('../repositories/course.repository');
const profileRepository = require('../repositories/profile.repository');
const testRepository = require('../repositories/test.repository');
const recommendRepository = require('../repositories/recommend.repository');
const aiService = require('./ai.service');
const { cosineSimilarity } = require('../utils/similarity');
const { safeParse } = require('../utils/json');

const FORMAL_TEST_TYPES = ['entrance', '408测评', 'stage'];
const DIFFICULTY_NAME_MAP = {
  1: '入门级',
  2: '初级',
  3: '中级',
  4: '高级',
  5: '专家级'
};
const DEFAULT_TOPICS = ['数据结构', '计算机网络', '操作系统', '计算机组成原理'];

/**
 * 课程推荐业务层
 * 核心方法: getRecommendedCourses - 基于画像 + 收藏 + 难度推荐
 */
module.exports = {
  /**
   * 推荐课程（新版本，组合画像/收藏/难度打分）
   */
  async getRecommendedCourses(userId, limit = 12) {
    let weakPoints = [];
    let interests = [];
    let userLevel = 1;

    if (userId) {
      const profile = await profileRepository.findByUserId(userId);
      if (profile) {
        try {
          weakPoints = JSON.parse(profile.weak_points || '[]');
          interests = JSON.parse(profile.interest_tags || '[]');
        } catch (_) {}
        if (profile.level === 'advanced') userLevel = 3;
        else if (profile.level === 'intermediate') userLevel = 2;
      }
      // 收藏课程的 tags 合并到兴趣
      const favTags = await recommendRepository.findUserFavoriteTags(userId);
      favTags.forEach(row => {
        if (row.tags) interests.push(...row.tags.split(','));
      });
    }

    const courses = await courseRepository.findAllActive();

    // 计算每门课的推荐分数
    const scored = courses.map(course => {
      const courseTags = course.tags ? course.tags.split(',') : [];
      const knowledgePoints = course.knowledge_points
        ? course.knowledge_points.split(',')
        : [];
      let score = 0;

      // 薄弱点匹配（最高权重 30 + 20）
      weakPoints.forEach(weak => {
        if (courseTags.some(t => t.includes(weak) || weak.includes(t))) score += 30;
        if (knowledgePoints.some(kp => kp.includes(weak) || weak.includes(kp))) score += 20;
      });
      // 兴趣匹配 15
      interests.forEach(interest => {
        if (courseTags.some(t => t.includes(interest) || interest.includes(t))) score += 15;
      });
      // 难度匹配 10
      const courseDifficulty = course.difficulty || 1;
      if (Math.abs(courseDifficulty - userLevel) <= 1) score += 10;
      else if (courseDifficulty <= userLevel) score += 5;
      // 浏览量基础分
      score += Math.min(15, (course.view_count || 0) / 100);

      // 推荐理由
      const matchedWeak = weakPoints.filter(
        w =>
          courseTags.some(t => t.includes(w) || w.includes(t)) ||
          knowledgePoints.some(kp => kp.includes(w) || w.includes(kp))
      );
      let reason = '热门推荐课程';
      if (matchedWeak.length) reason = `针对薄弱点：${matchedWeak.slice(0, 2).join('、')}`;
      else if (interests.length) reason = `匹配你的学习兴趣：${interests.slice(0, 2).join('、')}`;

      return {
        id: course.id,
        title: course.course_name,
        teacher: course.teacher,
        description: course.description,
        tags: courseTags,
        knowledgePoints,
        difficulty: courseDifficulty,
        difficultyName: DIFFICULTY_NAME_MAP[courseDifficulty] || '初级',
        studyDuration: course.study_duration,
        coverUrl: course.cover,
        recommendScore: Math.round(score),
        recommendReason: reason,
        isFavorite: false
      };
    });

    const top = scored.sort((a, b) => b.recommendScore - a.recommendScore).slice(0, limit);

    // 记录推荐
    if (userId && top.length) {
      for (const c of top) {
        await recommendRepository.createRecommendRecord({
          userId,
          courseId: c.id,
          recommendType: 'course',
          score: c.recommendScore
        });
      }
    }
    return top;
  },

  /**
   * 原始版推荐（基于最近一次测评的薄弱点，相似度算法）
   * 保留原接口 /courses/recommend
   */
  async recommendCoursesLegacy(userId) {
    const tests = await testRepository.findHistory(userId, FORMAL_TEST_TYPES);
    if (!tests.length) return [];
    const knowledgeDetail = safeParse(tests[0].knowledge_detail, {});
    const weakPoints = Object.entries(knowledgeDetail)
      .filter(([_, score]) => score < 60)
      .map(([subject]) => subject);

    const courses = await courseRepository.findAllActive();
    const result = courses
      .map(course => {
        const courseTags = course.tags ? course.tags.split(',') : [];
        const matchCount = courseTags.filter(tag => weakPoints.includes(tag)).length;
        const similarity = cosineSimilarity(
          weakPoints.map(() => 1),
          courseTags.map(t => (weakPoints.includes(t) ? 1 : 0))
        );
        return {
          id: course.id,
          course_name: course.course_name,
          difficulty: course.difficulty,
          matchCount,
          similarity: similarity.toFixed(2),
          recommendReason:
            matchCount > 0
              ? `匹配薄弱点：${courseTags.filter(t => weakPoints.includes(t)).join('、')}`
              : '基础课程'
        };
      })
      .filter(i => i.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
    return result;
  },

  /**
   * 个性化题目生成
   * - 优先取用户画像的薄弱点
   * - 用 AI 生成题目，失败时用默认题库兜底
   */
  async generatePersonalizedQuestions({
    userId,
    count = 10,
    level = '中等',
    subjects = [],
    focusOnWeakness = true
  }) {
    const total = Math.min(count, 15);
    let weakPoints = [];
    if (userId && focusOnWeakness) {
      const profile = await profileRepository.findByUserId(userId);
      if (profile) {
        try {
          weakPoints = JSON.parse(profile.weak_points || '[]');
        } catch (_) {}
      }
    }
    let topics = subjects;
    if (focusOnWeakness && weakPoints.length) {
      topics = [...new Set([...weakPoints, ...subjects.filter(s => !weakPoints.includes(s))])];
    }
    if (!topics.length) topics = [...DEFAULT_TOPICS];

    const perTopic = Math.ceil(total / topics.length);
    let all = [];

    for (const topic of topics.slice(0, 4)) {
      const need = Math.min(perTopic, total - all.length);
      if (need <= 0) break;
      try {
        const isWeak = weakPoints.includes(topic);
        const difficulty = isWeak ? '容易' : level;
        const questions = await aiService.generateQuestions(topic, need, difficulty);
        all = all.concat(
          questions.map(q => ({ ...q, subject: topic }))
        );
      } catch (e) {
        console.error(`生成【${topic}】题目失败:`, e.message);
      }
      // 避免 AI 请求过快
      await new Promise(r => setTimeout(r, 1000));
    }

    // 兜底
    if (all.length < total) {
      const needed = total - all.length;
      all = all.concat(DEFAULT_QUESTIONS.slice(0, needed));
    }
    // 洗牌
    return this._shuffle(all).slice(0, total);
  },

  /**
   * AI 学习建议
   */
  async getAIAdvice({ userId, weakSubjects, testScore }) {
    let weakPoints = weakSubjects || [];
    if (userId && (!weakPoints || !weakPoints.length)) {
      const profile = await profileRepository.findByUserId(userId);
      if (profile && profile.weak_points) {
        weakPoints = safeParse(profile.weak_points, []);
      }
    }
    if (!weakPoints.length) {
      return '继续保持学习节奏，多做练习巩固知识。相信你会越来越优秀！';
    }
    try {
      return await aiService.generateAdvice(weakPoints, testScore);
    } catch (e) {
      console.error('AI 建议生成失败:', e.message);
      const weakStr = weakPoints.slice(0, 3).join('、');
      return `根据你的测评结果，在${weakStr}方面需要加强。建议：1. 每天安排30分钟专项练习 2. 观看相关课程视频 3. 整理错题本巩固记忆。坚持一周会有明显提升！`;
    }
  },

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
};

const DEFAULT_QUESTIONS = [
  {
    question: '在计算机组成原理中，CPU执行指令的正确顺序是？',
    options: ['取指→译码→执行→写回', '译码→取指→执行→写回', '取指→执行→译码→写回', '执行→取指→译码→写回'],
    answer: 'A',
    subject: '计算机组成原理'
  },
  {
    question: 'TCP协议使用什么机制来实现可靠传输？',
    options: ['确认和重传', '流量控制', '拥塞控制', '以上都是'],
    answer: 'D',
    subject: '计算机网络'
  },
  {
    question: '在操作系统中，下面哪个不是进程的基本状态？',
    options: ['就绪态', '运行态', '阻塞态', '终止态'],
    answer: 'D',
    subject: '操作系统'
  },
  {
    question: '数据结构中，以下哪种排序算法在最坏情况下的时间复杂度最低？',
    options: ['冒泡排序', '快速排序', '归并排序', '插入排序'],
    answer: 'C',
    subject: '数据结构'
  },
  {
    question: '在数据库中，以下哪个操作用于从表中选取数据？',
    options: ['INSERT', 'UPDATE', 'DELETE', 'SELECT'],
    answer: 'D',
    subject: '数据库'
  }
];
