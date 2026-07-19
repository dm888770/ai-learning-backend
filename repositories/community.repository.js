// repositories/community.repository.js
const pool = require('../config/db');

module.exports = {
  /**
   * 获取帖子列表
   */
  async getPostList({ topicId, keyword, page = 1, limit = 20 }) {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = `
      SELECT 
        p.id,
        p.user_id,
        p.topic_id,
        p.post_type,
        p.title,
        p.content,
        p.view_count,
        p.like_count,
        p.comment_count,
        p.is_top,
        p.is_essence,
        p.is_anonymous,
        p.create_time,
        p.update_time,
        u.username,
        u.nickname,
        u.avatar,
        t.name as topic_name,
        t.icon as topic_icon,
        t.color as topic_color
      FROM db_community_post p
      LEFT JOIN db_user u ON p.user_id = u.id
      LEFT JOIN db_community_topic t ON p.topic_id = t.id
      WHERE p.status = 1
    `;
    const params = [];

    if (topicId) {
      sql += ' AND p.topic_id = ?';
      params.push(topicId);
    }

    if (keyword) {
      sql += ' AND (p.title LIKE ? OR p.content LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY p.is_top DESC, p.create_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(sql, params);

    // 获取总条数
    let countSql = 'SELECT COUNT(*) as total FROM db_community_post p WHERE p.status = 1';
    const countParams = [];
    if (topicId) {
      countSql += ' AND p.topic_id = ?';
      countParams.push(topicId);
    }
    if (keyword) {
      countSql += ' AND (p.title LIKE ? OR p.content LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    const [countResult] = await pool.query(countSql, countParams);

    return {
      list: rows,
      total: countResult[0].total
    };
  },

  /**
   * 获取帖子详情
   */
  async getPostDetail(postId) {
    const sql = `
      SELECT 
        p.*,
        u.username,
        u.nickname,
        u.avatar,
        t.name as topic_name,
        t.icon as topic_icon,
        t.color as topic_color
      FROM db_community_post p
      LEFT JOIN db_user u ON p.user_id = u.id
      LEFT JOIN db_community_topic t ON p.topic_id = t.id
      WHERE p.id = ? AND p.status = 1
    `;
    const [rows] = await pool.query(sql, [postId]);
    return rows[0] || null;
  },

  /**
   * 增加帖子浏览量
   */
  async incrementViewCount(postId) {
    await pool.query(
      'UPDATE db_community_post SET view_count = view_count + 1 WHERE id = ?',
      [postId]
    );
  },

  /**
   * 创建帖子
   */
  async createPost(data) {
    const sql = `
      INSERT INTO db_community_post (
        user_id, topic_id, post_type, title, content, 
        tags, is_anonymous, status, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
    `;
    const [result] = await pool.query(sql, [
      data.user_id,
      data.topic_id || null,
      data.post_type || 'normal',
      data.title || '',
      data.content,
      data.tags || null,
      data.is_anonymous || 0
    ]);

    // 更新话题帖子数
    if (data.topic_id) {
      await pool.query(
        'UPDATE db_community_topic SET post_count = post_count + 1 WHERE id = ?',
        [data.topic_id]
      );
    }

    return result.insertId;
  },

  /**
   * 更新帖子
   */
  async updatePost(postId, data) {
    const updates = [];
    const params = [];
    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      params.push(data.content);
    }
    if (data.topic_id !== undefined) {
      updates.push('topic_id = ?');
      params.push(data.topic_id);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(data.tags);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (updates.length === 0) return;

    params.push(postId);
    await pool.query(
      `UPDATE db_community_post SET ${updates.join(', ')}, update_time = NOW() WHERE id = ?`,
      params
    );
  },

  /**
   * 删除帖子（软删除）
   */
  async deletePost(postId, userId) {
    // 检查是否是作者
    const [post] = await pool.query(
      'SELECT user_id, topic_id FROM db_community_post WHERE id = ?',
      [postId]
    );
    if (post.length === 0) return false;
    if (post[0].user_id !== userId) return false;

    await pool.query(
      'UPDATE db_community_post SET status = 3 WHERE id = ?',
      [postId]
    );

    // 更新话题帖子数
    if (post[0].topic_id) {
      await pool.query(
        'UPDATE db_community_topic SET post_count = post_count - 1 WHERE id = ?',
        [post[0].topic_id]
      );
    }

    return true;
  },

  /**
   * 获取所有话题分类
   */
  async getTopics() {
    const [rows] = await pool.query(`
      SELECT id, name, description, icon, color, post_count, is_hot, is_official
      FROM db_community_topic
      WHERE status = 1
      ORDER BY sort ASC, id ASC
    `);
    return rows;
  },

  /**
   * 获取热门话题
   */
  async getHotTopics(limit = 6) {
    const [rows] = await pool.query(`
      SELECT id, name, description, icon, color, post_count, is_hot, is_official
      FROM db_community_topic
      WHERE status = 1 AND is_hot = 1
      ORDER BY post_count DESC, sort ASC
      LIMIT ?
    `, [limit]);
    return rows;
  }
};