// repositories/comment.repository.js
const pool = require('../config/db');

module.exports = {
  /**
   * 获取帖子的评论列表
   */
  async getCommentsByPost(postId) {
    const sql = `
      SELECT 
        c.id,
        c.user_id,
        c.content,
        c.like_count,
        c.create_time,
        u.username,
        u.nickname,
        u.avatar
      FROM db_community_comment c
      LEFT JOIN db_user u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.parent_id IS NULL AND c.status = 1
      ORDER BY c.create_time ASC
    `;
    const [rows] = await pool.query(sql, [postId]);
    return rows;
  },

  /**
   * 获取评论的子评论（楼中楼）
   */
  async getChildComments(parentId) {
    const sql = `
      SELECT 
        c.id,
        c.user_id,
        c.content,
        c.like_count,
        c.create_time,
        u.username,
        u.nickname,
        u.avatar,
        ru.username as reply_to_username
      FROM db_community_comment c
      LEFT JOIN db_user u ON c.user_id = u.id
      LEFT JOIN db_user ru ON c.reply_to_user_id = ru.id
      WHERE c.parent_id = ? AND c.status = 1
      ORDER BY c.create_time ASC
    `;
    const [rows] = await pool.query(sql, [parentId]);
    return rows;
  },

  /**
   * 创建评论
   */
  async createComment(data) {
    const sql = `
      INSERT INTO db_community_comment (
        post_id, user_id, parent_id, root_id, reply_to_user_id,
        content, status, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
    `;
    const [result] = await pool.query(sql, [
      data.post_id,
      data.user_id,
      data.parent_id || null,
      data.root_id || null,
      data.reply_to_user_id || null,
      data.content
    ]);

    // 更新帖子的评论数
    await pool.query(
      'UPDATE db_community_post SET comment_count = comment_count + 1 WHERE id = ?',
      [data.post_id]
    );

    // 如果有父评论，更新父评论的回复数
    if (data.parent_id) {
      await pool.query(
        'UPDATE db_community_comment SET reply_count = reply_count + 1 WHERE id = ?',
        [data.parent_id]
      );
    }

    return result.insertId;
  },

  /**
   * 删除评论
   */
  async deleteComment(commentId, userId) {
    const [comment] = await pool.query(
      'SELECT post_id, user_id FROM db_community_comment WHERE id = ?',
      [commentId]
    );
    if (comment.length === 0) return false;
    if (comment[0].user_id !== userId) return false;

    await pool.query(
      'UPDATE db_community_comment SET status = 0 WHERE id = ?',
      [commentId]
    );

    await pool.query(
      'UPDATE db_community_post SET comment_count = comment_count - 1 WHERE id = ?',
      [comment[0].post_id]
    );

    return true;
  }
};