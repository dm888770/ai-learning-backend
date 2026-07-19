// repositories/profile.repository.js
const pool = require('../config/db');

/**
 * 用户画像表数据访问层
 * 表: db_user_profile
 */
module.exports = {
  /**
   * 通过 userId 获取画像
   */
  async findByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT * FROM db_user_profile WHERE user_id = ?`,
      [userId]
    );
    return rows[0] || null;
  },

  /**
   * 插入或更新画像（REPLACE INTO）
   */
  async upsert(userId, data) {
    await pool.query(
      `REPLACE INTO db_user_profile (
         user_id, total_score, level, level_name, dimension_scores, subject_scores,
         weak_points, strong_points, learning_style, interest_tags, test_count,
         avg_score, highest_score, latest_score, improvement_rate, trend_data,
         recommend_directions, study_advice, update_time
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        data.total_score,
        data.level,
        data.level_name,
        JSON.stringify(data.dimension_scores),
        JSON.stringify(data.subject_scores),
        JSON.stringify(data.weak_points),
        JSON.stringify(data.strong_points),
        JSON.stringify(data.learning_style),
        JSON.stringify(data.interest_tags),
        data.test_count,
        data.avg_score,
        data.highest_score,
        data.latest_score,
        data.improvement_rate,
        JSON.stringify(data.trend_data),
        JSON.stringify(data.recommend_directions),
        data.study_advice
      ]
    );
  },

  // ==================== 新增个人中心方法 ====================

  /**
   * 获取用户统计（学习天数、连续学习等）
   */
  async getUserStats(userId) {
    const [rows] = await pool.query(`
      SELECT 
        COALESCE(study_days, 0) AS study_days,
        COALESCE(continuous_days, 0) AS continuous_days,
        COALESCE(chapters_finished, 0) AS chapters_finished,
        COALESCE(total_progress, 0) AS total_progress,
        COALESCE(total_score, 0) AS total_score,
        COALESCE(level, 'beginner') AS level,
        COALESCE(level_name, '入门级') AS level_name,
        COALESCE(latest_score, 0) AS latest_score,
        COALESCE(avg_score, 0) AS avg_score
      FROM db_user_profile
      WHERE user_id = ?
    `, [userId]);
    
    if (rows.length === 0) {
      return {
        study_days: 0,
        continuous_days: 0,
        chapters_finished: 0,
        total_progress: 0,
        total_score: 0,
        level: 'beginner',
        level_name: '入门级',
        latest_score: 0,
        avg_score: 0
      };
    }
    
    return rows[0];
  },

  /**
   * 更新用户统计字段
   */
  async updateUserStats(userId, data) {
    const updates = [];
    const params = [];
    
    if (data.study_days !== undefined) {
      updates.push('study_days = ?');
      params.push(data.study_days);
    }
    if (data.continuous_days !== undefined) {
      updates.push('continuous_days = ?');
      params.push(data.continuous_days);
    }
    if (data.chapters_finished !== undefined) {
      updates.push('chapters_finished = ?');
      params.push(data.chapters_finished);
    }
    if (data.total_progress !== undefined) {
      updates.push('total_progress = ?');
      params.push(data.total_progress);
    }
    if (data.total_score !== undefined) {
      updates.push('total_score = ?');
      params.push(data.total_score);
    }
    if (data.latest_score !== undefined) {
      updates.push('latest_score = ?');
      params.push(data.latest_score);
    }
    if (data.avg_score !== undefined) {
      updates.push('avg_score = ?');
      params.push(data.avg_score);
    }
    
    if (updates.length === 0) return;
    
    params.push(userId);
    await pool.query(
      `UPDATE db_user_profile SET ${updates.join(', ')}, update_time = NOW() WHERE user_id = ?`,
      params
    );
  },

  /**
   * 获取用户基本信息（包含昵称、头像等）
   * 修复：当 nickname 为空时使用 username
   */
  async getUserInfo(userId) {
    const [rows] = await pool.query(`
      SELECT 
        id,
        username,
        nickname,
        email,
        avatar,
        bio,
        learning_goal,
        knowledge_level,
        create_time AS join_date,
        last_login_time
      FROM db_user
      WHERE id = ?
    `, [userId]);
    
    // 如果存在记录且 nickname 为空，使用 username
    if (rows.length > 0 && !rows[0].nickname) {
      rows[0].nickname = rows[0].username;
    }
    
    return rows[0] || null;
  },

  /**
   * 更新用户基本信息
   */
  async updateUserInfo(userId, data) {
    const updates = [];
    const params = [];
    
    if (data.nickname !== undefined) {
      updates.push('nickname = ?');
      params.push(data.nickname);
    }
    if (data.avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(data.avatar);
    }
    if (data.bio !== undefined) {
      updates.push('bio = ?');
      params.push(data.bio);
    }
    if (data.learning_goal !== undefined) {
      updates.push('learning_goal = ?');
      params.push(data.learning_goal);
    }
    if (data.knowledge_level !== undefined) {
      updates.push('knowledge_level = ?');
      params.push(data.knowledge_level);
    }
    
    if (updates.length === 0) return;
    
    params.push(userId);
    await pool.query(
      `UPDATE db_user SET ${updates.join(', ')}, update_time = NOW() WHERE id = ?`,
      params
    );
  },

  /**
   * 获取用户里程碑
   */
  async getMilestones(userId) {
    const [rows] = await pool.query(`
      SELECT id, title, content, icon, milestone_date, category, is_unlocked
      FROM db_milestone
      WHERE user_id = ?
      ORDER BY milestone_date DESC
    `, [userId]);
    return rows;
  },

  /**
   * 创建里程碑
   */
  async createMilestone(userId, data) {
    const [result] = await pool.query(`
      INSERT INTO db_milestone (user_id, title, content, icon, milestone_date, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      data.title,
      data.content || '',
      data.icon || '🎯',
      data.milestone_date || new Date().toISOString().split('T')[0],
      data.category || 'learning'
    ]);
    return result.insertId;
  },

  /**
   * 获取所有成就定义
   */
  async getAllAchievementDefs() {
    const [rows] = await pool.query(`
      SELECT id, name, icon, description, condition_type, condition_value, category
      FROM db_achievement_def
      WHERE is_active = 1
      ORDER BY sort_order ASC
    `);
    return rows;
  },

  /**
   * 获取用户已解锁的成就
   */
  async getUserAchievements(userId) {
    const [rows] = await pool.query(`
      SELECT 
        a.id,
        a.achievement_id,
        a.unlocked_at,
        a.progress,
        a.is_unlocked,
        ad.name,
        ad.icon,
        ad.description,
        ad.category
      FROM db_user_achievement a
      JOIN db_achievement_def ad ON a.achievement_id = ad.id
      WHERE a.user_id = ?
      ORDER BY a.unlocked_at DESC
    `, [userId]);
    return rows;
  },

  /**
   * 解锁成就
   */
  async unlockAchievement(userId, achievementId) {
    const [existing] = await pool.query(
      'SELECT id FROM db_user_achievement WHERE user_id = ? AND achievement_id = ?',
      [userId, achievementId]
    );
    
    if (existing.length > 0) {
      await pool.query(`
        UPDATE db_user_achievement
        SET is_unlocked = 1, unlocked_at = NOW(), update_time = NOW()
        WHERE user_id = ? AND achievement_id = ?
      `, [userId, achievementId]);
    } else {
      await pool.query(`
        INSERT INTO db_user_achievement (user_id, achievement_id, is_unlocked, unlocked_at)
        VALUES (?, ?, 1, NOW())
      `, [userId, achievementId]);
    }
  },

  /**
   * 更新成就进度
   */
  async updateAchievementProgress(userId, achievementId, progress) {
    const [existing] = await pool.query(
      'SELECT id FROM db_user_achievement WHERE user_id = ? AND achievement_id = ?',
      [userId, achievementId]
    );
    
    if (existing.length > 0) {
      await pool.query(`
        UPDATE db_user_achievement
        SET progress = ?, update_time = NOW()
        WHERE user_id = ? AND achievement_id = ?
      `, [progress, userId, achievementId]);
    } else {
      await pool.query(`
        INSERT INTO db_user_achievement (user_id, achievement_id, progress, is_unlocked)
        VALUES (?, ?, ?, 0)
      `, [userId, achievementId, progress]);
    }
  },

  /**
   * 获取学习记录
   */
  async getStudyRecords(userId, limit = 10) {
    const [rows] = await pool.query(`
      SELECT id, record_date, content, duration_minutes, chapters_done, problems_done
      FROM db_study_record
      WHERE user_id = ?
      ORDER BY record_date DESC
      LIMIT ?
    `, [userId, limit]);
    return rows;
  },

  /**
   * 创建学习记录
   */
  async createStudyRecord(userId, data) {
    const [result] = await pool.query(`
      INSERT INTO db_study_record (
        user_id, record_date, content, duration_minutes, chapters_done, problems_done
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      data.record_date || new Date().toISOString().split('T')[0],
      data.content || '',
      data.duration_minutes || 0,
      data.chapters_done || 0,
      data.problems_done || 0
    ]);
    return result.insertId;
  },

  /**
   * 获取学习回顾统计
   */
  async getReviewStats(userId, period = 'week') {
    let dateCondition;
    if (period === 'week') {
      dateCondition = "record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    } else if (period === 'month') {
      dateCondition = "record_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    } else {
      dateCondition = "1=1";
    }
    
    const [rows] = await pool.query(`
      SELECT 
        COALESCE(SUM(duration_minutes), 0) AS total_minutes,
        COALESCE(COUNT(*), 0) AS record_count,
        COALESCE(SUM(chapters_done), 0) AS total_chapters,
        COALESCE(SUM(problems_done), 0) AS total_problems
      FROM db_study_record
      WHERE user_id = ? AND ${dateCondition}
    `, [userId]);
    
    return rows[0] || { 
      total_minutes: 0, 
      record_count: 0, 
      total_chapters: 0, 
      total_problems: 0 
    };
  },

  /**
   * 获取学习日历数据
   */
  async getStudyCalendar(userId, year, month) {
    const [rows] = await pool.query(`
      SELECT 
        record_date,
        duration_minutes,
        chapters_done,
        problems_done
      FROM db_study_record
      WHERE user_id = ?
        AND YEAR(record_date) = ?
        AND MONTH(record_date) = ?
      ORDER BY record_date ASC
    `, [userId, year, month]);
    return rows;
  },

  /**
   * 获取完整个人中心数据
   */
  async getFullProfile(userId) {
    const [
      userInfo,
      stats,
      milestones,
      achievements,
      records
    ] = await Promise.all([
      this.getUserInfo(userId),
      this.getUserStats(userId),
      this.getMilestones(userId),
      (async () => {
        const [allDefs, userAchs] = await Promise.all([
          this.getAllAchievementDefs(),
          this.getUserAchievements(userId)
        ]);
        const map = {};
        userAchs.forEach(a => { map[a.achievement_id] = a; });
        return allDefs.map(def => ({
          id: def.id,
          name: def.name,
          icon: def.icon || '🏆',
          desc: def.description || '',
          unlocked: !!(map[def.id] && map[def.id].is_unlocked === 1),
          progress: map[def.id]?.progress || 0
        }));
      })(),
      this.getStudyRecords(userId, 5)
    ]);

    return {
      user: userInfo,
      stats: stats,
      milestones: milestones,
      achievements: achievements,
      records: records
    };
  },

  /**
   * 获取课程进度
   */
  async getCourseProgress(userId) {
    const [rows] = await pool.query(`
      SELECT id, course_id, course_name, icon, progress, status,
             completed_date, total_chapters, completed_chapters
      FROM db_user_course_progress
      WHERE user_id = ?
      ORDER BY FIELD(status, "active", "not_started", "completed"), progress DESC
    `, [userId]);
    return rows;
  },

  /**
   * 更新课程进度
   */
  async updateCourseProgress(userId, courseId, data) {
    const [existing] = await pool.query(
      'SELECT id FROM db_user_course_progress WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    
    if (existing.length > 0) {
      const updates = [];
      const params = [];
      
      if (data.progress !== undefined) {
        updates.push('progress = ?');
        params.push(data.progress);
        if (data.progress >= 100) {
          updates.push('status = "completed"');
          updates.push('completed_date = CURDATE()');
        }
      }
      if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
      }
      if (data.course_name !== undefined) {
        updates.push('course_name = ?');
        params.push(data.course_name);
      }
      if (data.icon !== undefined) {
        updates.push('icon = ?');
        params.push(data.icon);
      }
      if (data.completed_chapters !== undefined) {
        updates.push('completed_chapters = ?');
        params.push(data.completed_chapters);
      }
      if (data.total_chapters !== undefined) {
        updates.push('total_chapters = ?');
        params.push(data.total_chapters);
      }
      
      if (updates.length === 0) return;
      
      params.push(userId, courseId);
      await pool.query(
        `UPDATE db_user_course_progress SET ${updates.join(', ')}, update_time = NOW()
         WHERE user_id = ? AND course_id = ?`,
        params
      );
    } else {
      await pool.query(`
        INSERT INTO db_user_course_progress (
          user_id, course_id, course_name, icon, progress, status, total_chapters, completed_chapters
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        courseId,
        data.course_name || '课程',
        data.icon || '📚',
        data.progress || 0,
        data.status || 'active',
        data.total_chapters || 0,
        data.completed_chapters || 0
      ]);
    }
  }
};