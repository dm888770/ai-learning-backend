const pool = require('../config/db');

/**
 * 推荐相关表数据访问层
 * 涉及表:
 *   - db_recommend_record 推荐记录
 *   - db_coursecollect    课程收藏
 *   - db_courselook       课程浏览
 *   - db_userlabel        用户标签
 */
module.exports = {
  // ========== 推荐记录 ==========
  /**
   * 插入一条推荐记录
   */
  async createRecommendRecord({ userId, courseId = null, recommendType, score = null }) {
    if (score !== null) {
      await pool.query(
        `INSERT INTO db_recommend_record (user_id, course_id, recommend_type, score, recommend_time)
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, courseId, recommendType, score]
      );
    } else {
      await pool.query(
        `INSERT INTO db_recommend_record (user_id, course_id, recommend_type, recommend_time)
         VALUES (?, ?, ?, NOW())`,
        [userId, courseId, recommendType]
      );
    }
  },

  /**
   * 更新推荐记录点击状态
   */
  async markClick(recommendId) {
    await pool.query(
      `UPDATE db_recommend_record SET is_click = 1 WHERE id = ?`,
      [recommendId]
    );
  },

  // ========== 收藏 ==========
  /**
   * 查询用户收藏的课程（含课程详情）
   */
  async findUserFavorites(userId) {
    const [rows] = await pool.query(
      `SELECT c.*, cc.collect_time
       FROM db_course c
       JOIN db_coursecollect cc ON c.id = cc.course_id
       WHERE cc.user_id = ?
       ORDER BY cc.collect_time DESC`,
      [userId]
    );
    return rows;
  },

  /**
   * 查询用户收藏课程的 tags
   */
  async findUserFavoriteTags(userId) {
    const [rows] = await pool.query(
      `SELECT c.tags, c.course_name
       FROM db_coursecollect cc
       JOIN db_course c ON cc.course_id = c.id
       WHERE cc.user_id = ?`,
      [userId]
    );
    return rows;
  },

  /**
   * 查询用户已收藏的课程 id
   */
  async findFavoriteIds(userId) {
    const [rows] = await pool.query(
      `SELECT course_id FROM db_coursecollect WHERE user_id = ?`,
      [userId]
    );
    return rows.map(r => r.course_id);
  },

  /**
   * 查找是否已收藏
   */
  async findFavorite(userId, courseId) {
    const [rows] = await pool.query(
      `SELECT id FROM db_coursecollect WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );
    return rows[0] || null;
  },

  /**
   * 收藏
   */
  async addFavorite(userId, courseId) {
    await pool.query(
      `INSERT INTO db_coursecollect (user_id, course_id, collect_time) VALUES (?, ?, NOW())`,
      [userId, courseId]
    );
  },

  /**
   * 取消收藏
   */
  async removeFavorite(userId, courseId) {
    await pool.query(
      `DELETE FROM db_coursecollect WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );
  },

  // ========== 浏览 ==========
  /**
   * 查询用户浏览历史
   */
  async findViewHistory(userId, limit = 10) {
    const [rows] = await pool.query(
      `SELECT cl.*, c.course_name, c.teacher, c.description
       FROM db_courselook cl
       JOIN db_course c ON cl.course_id = c.id
       WHERE cl.user_id = ?
       ORDER BY cl.look_time DESC LIMIT ?`,
      [userId, parseInt(limit)]
    );
    return rows;
  },

  /**
   * 查找是否已浏览
   */
  async findView(userId, courseId) {
    const [rows] = await pool.query(
      `SELECT id FROM db_courselook WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );
    return rows[0] || null;
  },

  /**
   * 记录浏览
   */
  async addView(userId, courseId) {
    await pool.query(
      `INSERT INTO db_courselook (user_id, course_id, look_time) VALUES (?, ?, NOW())`,
      [userId, courseId]
    );
  },

  /**
   * 更新浏览时间
   */
  async updateViewTime(userId, courseId) {
    await pool.query(
      `UPDATE db_courselook SET look_time = NOW() WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );
  },

  // ========== 用户标签 ==========
  /**
   * 查询用户标签
   * @param {string} source 'interest' | null（不传则查全部）
   */
  async findLabels(userId, source = null) {
    if (source) {
      const [rows] = await pool.query(
        `SELECT id, label_name, label_weight, source, create_time
         FROM db_userlabel WHERE user_id = ? AND source = ?`,
        [userId, source]
      );
      return rows;
    }
    const [rows] = await pool.query(
      `SELECT id, label_name, label_weight, source, create_time
       FROM db_userlabel WHERE user_id = ?`,
      [userId]
    );
    return rows;
  },

  /**
   * 删除某 source 的全部标签
   */
  async deleteLabelsBySource(userId, source) {
    await pool.query(
      `DELETE FROM db_userlabel WHERE user_id = ? AND source = ?`,
      [userId, source]
    );
  },

  /**
   * 删除指定名称的标签
   */
  async deleteLabelsByNames(userId, source, names) {
    const placeholders = names.map(() => '?').join(',');
    await pool.query(
      `DELETE FROM db_userlabel
       WHERE user_id = ? AND source = ? AND label_name IN (${placeholders})`,
      [userId, source, ...names]
    );
  },

  /**
   * 插入标签
   */
  async insertLabel(userId, name, weight = 1.0, source = 'interest') {
    await pool.query(
      `INSERT INTO db_userlabel (user_id, label_name, label_weight, source, create_time)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, name, weight, source]
    );
  },

  /**
   * 增加标签权重
   */
  async incrementLabelWeight(userId, name, increment, source = 'interest') {
    await pool.query(
      `UPDATE db_userlabel
       SET label_weight = LEAST(5.0, label_weight + ?)
       WHERE user_id = ? AND label_name = ? AND source = ?`,
      [increment, userId, name, source]
    );
  }
};
