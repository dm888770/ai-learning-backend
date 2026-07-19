const courseRepository = require('../repositories/course.repository');
const recommendRepository = require('../repositories/recommend.repository');
const { safeParse } = require('../utils/json');

const DIFFICULTY_NAME_MAP = {
  1: '入门级',
  2: '初级',
  3: '中级',
  4: '高级',
  5: '专家级'
};

/**
 * 课程业务层
 * 课程CRUD、详情、收藏、浏览
 */
module.exports = {
  /**
   * 获取最新课程
   */
  async getLatestCourses(limit = 10) {
    const rows = await courseRepository.findLatest(limit);
    return rows.map(row => ({
      id: row.id,
      title: row.course_name,
      teacher: row.teacher,
      description: row.description,
      coverUrl: row.cover,
      difficulty: row.difficulty,
      difficultyName: DIFFICULTY_NAME_MAP[row.difficulty] || '初级',
      studyDuration: row.study_duration,
      tags: row.tags ? row.tags.split(',') : [],
      createTime: row.create_time,
      isFavorite: false
    }));
  },

  /**
   * 获取课程详情（含浏览量+1、记录浏览）
   */
  async getCourseDetail(courseId, userId) {
    const course = await courseRepository.findById(courseId);
    if (!course) {
      throw { statusCode: 404, message: '课程不存在' };
    }
    await courseRepository.incrementViewCount(courseId);
    if (userId) {
      await this._recordView(userId, courseId);
    }
    return {
      id: course.id,
      title: course.course_name,
      teacher: course.teacher,
      description: course.description,
      coverUrl: course.cover,
      difficulty: course.difficulty,
      difficultyName: DIFFICULTY_NAME_MAP[course.difficulty] || '初级',
      studyDuration: course.study_duration,
      tags: course.tags ? course.tags.split(',') : [],
      knowledgePoints: course.knowledge_points ? course.knowledge_points.split(',') : [],
      preKnowledge: course.pre_knowledge,
      viewCount: course.view_count || 0,
      price: course.price
    };
  },

  /**
   * 用户收藏列表
   */
  async getUserFavorites(userId) {
    const rows = await recommendRepository.findUserFavorites(userId);
    return rows.map(row => ({
      id: row.id,
      title: row.course_name,
      teacher: row.teacher,
      description: row.description,
      coverUrl: row.cover,
      difficulty: row.difficulty,
      difficultyName: DIFFICULTY_NAME_MAP[row.difficulty] || '初级',
      studyDuration: row.study_duration,
      tags: row.tags ? row.tags.split(',') : [],
      collectTime: row.collect_time,
      isFavorite: true
    }));
  },

  /**
   * 切换收藏状态
   */
  async toggleFavorite(userId, courseId) {
    if (!userId || !courseId) {
      throw { statusCode: 400, message: '参数不完整' };
    }
    const existing = await recommendRepository.findFavorite(userId, courseId);
    if (existing) {
      await recommendRepository.removeFavorite(userId, courseId);
      return { isFavorite: false };
    }
    await recommendRepository.addFavorite(userId, courseId);
    return { isFavorite: true };
  },

  /**
   * 记录点击（更新推荐记录点击 + 浏览）
   */
  async recordCourseClick(userId, courseId, recommendId) {
    if (!userId || !courseId) return;
    if (recommendId) {
      await recommendRepository.markClick(recommendId);
    }
    await this._recordView(userId, courseId);
  },

  /**
   * 记录观看
   */
  async recordCourseView(userId, courseId) {
    if (!userId || !courseId) {
      throw { statusCode: 400, message: '参数不完整' };
    }
    await this._recordView(userId, courseId);
  },

  /**
   * 浏览历史
   */
  async getUserViewHistory(userId, limit = 10) {
    if (!userId) return [];
    return recommendRepository.findViewHistory(userId, limit);
  },

  /**
   * 内部：记录浏览
   */
  async _recordView(userId, courseId) {
    const existing = await recommendRepository.findView(userId, courseId);
    if (existing) {
      await recommendRepository.updateViewTime(userId, courseId);
    } else {
      await recommendRepository.addView(userId, courseId);
    }
  }
};
