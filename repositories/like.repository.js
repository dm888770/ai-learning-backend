// repositories/like.repository.js
const pool = require('../config/db');

module.exports = {
  /**
   * 检查是否已点赞
   */
  async checkLiked(userId, targetType, targetId) {
    const [rows] = await pool.query(
      'SELECT id FROM db_community_like WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, targetType, targetId]
    );
    return rows.length > 0;
  },

  /**
   * 添加点赞
   */
  async addLike(userId, targetType, targetId) {
    // 检查是否已存在
    const exists = await this.checkLiked(userId, targetType, targetId);
    if (exists) return false;

    await pool.query(
      'INSERT INTO db_community_like (user_id, target_type, target_id, create_time) VALUES (?, ?, ?, NOW())',
      [userId, targetType, targetId]
    );

    // 更新目标表的点赞数
    if (targetType === 'post') {
      await pool.query(
        'UPDATE db_community_post SET like_count = like_count + 1 WHERE id = ?',
        [targetId]
      );
    } else if (targetType === 'comment') {
      await pool.query(
        'UPDATE db_community_comment SET like_count = like_count + 1 WHERE id = ?',
        [targetId]
      );
    }

    return true;
  },

  /**
   * 取消点赞
   */
  async removeLike(userId, targetType, targetId) {
    const exists = await this.checkLiked(userId, targetType, targetId);
    if (!exists) return false;

    await pool.query(
      'DELETE FROM db_community_like WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, targetType, targetId]
    );

    // 更新目标表的点赞数
    if (targetType === 'post') {
      await pool.query(
        'UPDATE db_community_post SET like_count = like_count - 1 WHERE id = ?',
        [targetId]
      );
    } else if (targetType === 'comment') {
      await pool.query(
        'UPDATE db_community_comment SET like_count = like_count - 1 WHERE id = ?',
        [targetId]
      );
    }

    return true;
  },

  /**
   * 切换点赞状态
   */
  async toggleLike(userId, targetType, targetId) {
    const liked = await this.checkLiked(userId, targetType, targetId);
    if (liked) {
      await this.removeLike(userId, targetType, targetId);
      return { liked: false, action: 'removed' };
    } else {
      await this.addLike(userId, targetType, targetId);
      return { liked: true, action: 'added' };
    }
  }
};