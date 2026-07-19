/**
 * 用户表数据访问层
 * 表: db_user
 */
const pool = require('../config/db');

module.exports = {
  /**
   * 检查用户名或邮箱是否已存在
   * @param {string} username 
   * @param {string} email 
   * @returns {Promise<object|null>}
   */
  async findExistingByAccount(username, email) {
    const [rows] = await pool.query(
      `SELECT id, username, email FROM db_user WHERE username = ? OR email = ? LIMIT 1`,
      [username, email]
    );
    return rows[0] || null;
  },

  /**
   * 创建新用户
   * @param {object} userData {username, password, email, phone, nickname}
   * @returns {Promise<object>} 插入的用户ID和基本信息
   */
  async create({ username, password, email, phone = null, nickname = null }) {
    const [result] = await pool.query(
      `INSERT INTO db_user (username, password, email, phone, nickname, is_active) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [username, password, email, phone, nickname]
    );
    return {
      id: result.insertId,
      username,
      email,
      phone,
      nickname
    };
  },

  /**
   * 登录验证：查找用户名和密码匹配的用户
   * 返回除密码外的所有字段
   * @param {string} username 
   * @param {string} password (MD5加密后的)
   * @returns {Promise<object|null>}
   */
  async findForLogin(username, password) {
    const [rows] = await pool.query(
      `SELECT id, username, email, phone, nickname, avatar, gender, age, grade, 
              bio, learning_goal, knowledge_level, target_school, exam_year, 
              daily_study_minutes, study_status, current_stage_id, current_plan_id,
              last_login_time, is_active, create_time
       FROM db_user 
       WHERE username = ? AND password = ?`,
      [username, password]
    );
    return rows[0] || null;
  },

  /**
   * 通过 ID 查询用户
   * @param {number} id 
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT id, username, email, phone, nickname, avatar, gender, age, grade,
              bio, learning_goal, knowledge_level, target_school, exam_year,
              daily_study_minutes, study_status, current_stage_id, current_plan_id,
              last_login_time, is_active, create_time
       FROM db_user WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * 更新用户最后登录时间
   * @param {number} id 
   */
  async updateLastLoginTime(id) {
    await pool.query(
      `UPDATE db_user SET last_login_time = NOW() WHERE id = ?`,
      [id]
    );
  }
};
