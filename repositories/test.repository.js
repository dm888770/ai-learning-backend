// repositories/test.repository.js - 添加 findRecent 方法

const pool = require('../config/db');
const { safeStringify, safeParse } = require('../utils/json');

module.exports = {
  // ... 现有方法保持不变 ...

  /**
   * 🔧 新增：查询用户最近测评
   */
  async findRecent(userId, testTypes = [], limit = 5) {
    let sql = `SELECT * FROM db_user_test WHERE user_id = ?`;
    const params = [userId];
    
    if (testTypes && testTypes.length > 0) {
      const placeholders = testTypes.map(() => '?').join(',');
      sql += ` AND test_type IN (${placeholders})`;
      params.push(...testTypes);
    }
    
    sql += ` ORDER BY test_time DESC LIMIT ?`;
    params.push(limit);
    
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * 🔧 新增：查询用户所有测评历史
   */
  async findAllHistory(userId) {
    const [rows] = await pool.query(
      `SELECT * FROM db_user_test WHERE user_id = ? ORDER BY test_time DESC`,
      [userId]
    );
    return rows;
  },

  /**
   * 🔧 新增：创建测评记录
   */
  async create({ userId, testType, userScore, totalScore = 100, accuracy, durationSeconds = 0, knowledgeDetail = {}, weakSubjectsJson = null }) {
    const [result] = await pool.query(`
      INSERT INTO db_user_test (user_id, test_type, user_score, total_score, accuracy, duration_seconds, knowledge_detail, weak_subjects_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      testType || 'knowledge',
      userScore || 0,
      totalScore,
      accuracy || (userScore / totalScore),
      durationSeconds || 0,
      safeStringify(knowledgeDetail),
      weakSubjectsJson || safeStringify(knowledgeDetail)
    ]);
    return { id: result.insertId };
  },

  /**
   * 🔧 新增：查询测评历史
   */
  async findHistory(userId, testTypes = []) {
    let sql = `SELECT * FROM db_user_test WHERE user_id = ?`;
    const params = [userId];
    
    if (testTypes && testTypes.length > 0) {
      const placeholders = testTypes.map(() => '?').join(',');
      sql += ` AND test_type IN (${placeholders})`;
      params.push(...testTypes);
    }
    
    sql += ` ORDER BY test_time DESC`;
    
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * 🔧 新增：查询最新测评
   */
  async findLatest(userId, testTypes = []) {
    const rows = await this.findRecent(userId, testTypes, 1);
    return rows[0] || null;
  }
};