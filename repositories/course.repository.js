// repositories/course.repository.js - 完整修复版（支持错题分类）

const pool = require('../config/db');

module.exports = {
  // ========== 课程相关 ==========

  /**
   * 获取所有课程
   */
  async findAll() {
    const [rows] = await pool.query(`
      SELECT c.*, cat.name as category_name
      FROM db_course c
      LEFT JOIN db_course_category cat ON c.category_id = cat.id
      WHERE c.status = 1
      ORDER BY c.sort_order ASC, c.create_time DESC
    `);
    return rows;
  },

  /**
   * 根据分类获取课程
   */
  async findByCategory(categoryId) {
    const [rows] = await pool.query(`
      SELECT c.*, cat.name as category_name
      FROM db_course c
      LEFT JOIN db_course_category cat ON c.category_id = cat.id
      WHERE c.category_id = ? AND c.status = 1
      ORDER BY c.sort_order ASC
    `, [categoryId]);
    return rows;
  },

  /**
   * 根据类型获取课程
   */
  async findByType(type) {
    const [rows] = await pool.query(`
      SELECT c.*, cat.name as category_name
      FROM db_course c
      LEFT JOIN db_course_category cat ON c.category_id = cat.id
      WHERE c.type = ? AND c.status = 1
      ORDER BY c.sort_order ASC
    `, [type]);
    return rows;
  },

  /**
   * 根据ID获取课程
   */
  async findById(id) {
    const [rows] = await pool.query(`
      SELECT c.*, cat.name as category_name, cat.icon as category_icon
      FROM db_course c
      LEFT JOIN db_course_category cat ON c.category_id = cat.id
      WHERE c.id = ? AND c.status = 1
    `, [id]);
    return rows[0] || null;
  },

  /**
   * 获取推荐课程
   */
  async findRecommended(limit = 10) {
    const [rows] = await pool.query(`
      SELECT c.*, cat.name as category_name
      FROM db_course c
      LEFT JOIN db_course_category cat ON c.category_id = cat.id
      WHERE c.is_recommended = 1 AND c.status = 1
      ORDER BY c.view_count DESC, c.rating DESC
      LIMIT ?
    `, [limit]);
    return rows;
  },

  /**
   * 获取热门课程
   */
  async findHot(limit = 10) {
    const [rows] = await pool.query(`
      SELECT c.*, cat.name as category_name
      FROM db_course c
      LEFT JOIN db_course_category cat ON c.category_id = cat.id
      WHERE c.hot = 1 AND c.status = 1
      ORDER BY c.view_count DESC, c.rating DESC
      LIMIT ?
    `, [limit]);
    return rows;
  },

  /**
   * 搜索课程
   */
  async search(keyword) {
    const [rows] = await pool.query(`
      SELECT c.*, cat.name as category_name
      FROM db_course c
      LEFT JOIN db_course_category cat ON c.category_id = cat.id
      WHERE c.status = 1
        AND (c.title LIKE ? OR c.teacher LIKE ? OR c.school LIKE ? OR c.tags LIKE ?)
      ORDER BY c.view_count DESC
    `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);
    return rows;
  },

  /**
   * 获取分类列表
   */
  async getCategories() {
    const [rows] = await pool.query(`
      SELECT * FROM db_course_category WHERE status = 1 ORDER BY sort_order ASC
    `);
    return rows;
  },

  /**
   * 增加浏览量
   */
  async incrementViewCount(id) {
    await pool.query(
      `UPDATE db_course SET view_count = view_count + 1 WHERE id = ?`,
      [id]
    );
  },

  // ========== 用户课程进度 ==========

  /**
   * 获取用户课程进度
   */
  async getUserProgress(userId, courseId) {
    const [rows] = await pool.query(
      `SELECT * FROM db_user_course_progress WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );
    return rows[0] || null;
  },

  /**
   * 获取用户所有课程进度
   */
  async getUserAllProgress(userId) {
    const [rows] = await pool.query(`
      SELECT p.*, c.title, c.teacher, c.cover_url
      FROM db_user_course_progress p
      JOIN db_course c ON p.course_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.update_time DESC
    `, [userId]);
    return rows;
  },

  /**
   * 更新课程进度
   */
  async updateProgress(userId, courseId, progress) {
    await pool.query(`
      INSERT INTO db_user_course_progress (user_id, course_id, progress, status, last_study_time)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        progress = ?,
        status = CASE WHEN ? >= 100 THEN 2 ELSE 1 END,
        last_study_time = NOW()
    `, [userId, courseId, progress, progress >= 100 ? 2 : 1, progress, progress]);
  },

  // ========== 收藏 ==========

  /**
   * 获取用户收藏的课程
   */
  async getUserFavorites(userId) {
    const [rows] = await pool.query(`
      SELECT c.*, p.is_favorite, p.progress
      FROM db_course c
      JOIN db_user_course_progress p ON c.id = p.course_id
      WHERE p.user_id = ? AND p.is_favorite = 1 AND c.status = 1
      ORDER BY p.update_time DESC
    `, [userId]);
    return rows;
  },

  /**
   * 切换收藏状态
   */
  async toggleFavorite(userId, courseId) {
    const [existing] = await pool.query(
      `SELECT id FROM db_user_course_progress WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );
    if (existing.length > 0) {
      await pool.query(
        `UPDATE db_user_course_progress SET is_favorite = NOT is_favorite WHERE user_id = ? AND course_id = ?`,
        [userId, courseId]
      );
      const [updated] = await pool.query(
        `SELECT is_favorite FROM db_user_course_progress WHERE user_id = ? AND course_id = ?`,
        [userId, courseId]
      );
      return updated[0].is_favorite === 1;
    } else {
      await pool.query(
        `INSERT INTO db_user_course_progress (user_id, course_id, is_favorite, status) VALUES (?, ?, 1, 0)`,
        [userId, courseId]
      );
      return true;
    }
  },

  // ========== 错题（核心修改） ==========

  /**
   * 🔧 修改：获取错题列表 - 关联 db_question 表获取科目信息
   */
  async getWrongQuestions(userId, limit = 10) {
    const [rows] = await pool.query(`
      SELECT 
        w.id, 
        w.user_id, 
        w.question_id, 
        w.wrong_count,
        w.mastered, 
        w.user_answer, 
        w.note,
        w.last_wrong_at,
        w.create_time,
        q.subject AS course,
        q.knowledge_point AS category,
        q.stem AS question_text,
        q.answer AS correct_answer,
        q.analysis,
        q.options_json AS options,
        q.source,
        q.difficulty
      FROM db_wrong_question w
      LEFT JOIN db_question q ON w.question_id = q.id
      WHERE w.user_id = ? AND w.mastered = 0
      ORDER BY w.wrong_count DESC, w.last_wrong_at DESC
      LIMIT ?
    `, [userId, limit]);
    
    // 处理返回数据
    return rows.map(row => {
      let options = []
      if (row.options) {
        try {
          const parsed = typeof row.options === 'string' ? JSON.parse(row.options) : row.options
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            options = Object.entries(parsed).map(([key, val]) => `${key}. ${val}`)
          } else if (Array.isArray(parsed)) {
            options = parsed
          }
        } catch(e) {
          options = []
        }
      }
      
      // 如果没有 subject，尝试从其他字段推断
      let course = row.course || '数据结构'
      const validCourses = ['数据结构', '人工智能', '硬件与系统', '软件工程']
      if (!validCourses.includes(course)) {
        // 从知识点或题目内容推断
        const text = row.category || row.question_text || ''
        if (text.includes('数据结构') || text.includes('算法') || text.includes('栈') || 
            text.includes('队列') || text.includes('树') || text.includes('图') || 
            text.includes('排序') || text.includes('链表') || text.includes('哈希')) {
          course = '数据结构'
        } else if (text.includes('人工智能') || text.includes('AI') || text.includes('机器学习') || 
                   text.includes('神经网络') || text.includes('激活函数') || text.includes('过拟合')) {
          course = '人工智能'
        } else if (text.includes('硬件') || text.includes('系统') || text.includes('LRU') || 
                   text.includes('进程') || text.includes('死锁') || text.includes('流水线') ||
                   text.includes('冯诺依曼') || text.includes('调度') || text.includes('内存')) {
          course = '硬件与系统'
        } else if (text.includes('软件') || text.includes('Scrum') || text.includes('设计模式') ||
                   text.includes('TCP') || text.includes('HTTP') || text.includes('IP') ||
                   text.includes('网络') || text.includes('协议') || text.includes('测试')) {
          course = '软件工程'
        }
      }
      
      // 分类处理
      let category = row.category || '概念不清'
      if (!['概念不清', '审题错误', '计算粗心', '综合应用'].includes(category)) {
        if (category.includes('概念') || category.includes('定义') || category.includes('原理')) {
          category = '概念不清'
        } else if (category.includes('计算') || category.includes('运算')) {
          category = '计算粗心'
        } else if (category.includes('应用') || category.includes('综合')) {
          category = '综合应用'
        } else {
          category = '概念不清'
        }
      }
      
      return {
        id: row.id,
        question_id: row.question_id,
        course: course,
        category: category,
        question_text: row.question_text || '题目内容',
        correct_answer: row.correct_answer || '未填写',
        user_answer: row.user_answer || '未填写',
        wrong_count: row.wrong_count || 0,
        mastered: row.mastered === 1,
        source: row.source || '阶段测试',
        analysis: row.analysis || '暂无详细解析',
        options: options,
        difficulty: row.difficulty,
        last_wrong_at: row.last_wrong_at,
        create_time: row.create_time,
        // 兼容前端字段
        question: row.question_text || '题目内容',
        reviewCount: row.wrong_count || 0,
        nextReview: '今天',
        categoryType: category === '概念不清' ? 'concept' : 'careless'
      }
    })
  },

  /**
   * 🔧 修改：添加错题 - 支持自定义科目和分类
   */
  async addWrongQuestion(data) {
    const { 
      user_id, 
      question_id, 
      course, 
      category, 
      question_text, 
      correct_answer, 
      user_answer, 
      source,
      note 
    } = data;
    
    // 检查是否已存在相同题目（根据用户ID和题目内容）
    const [existing] = await pool.query(
      `SELECT id, wrong_count FROM db_wrong_question
       WHERE user_id = ? AND question_id = ?`,
      [user_id, question_id || null]
    );
    
    // 如果 question_id 为空，通过题目内容查找
    let finalQuestionId = question_id;
    if (!finalQuestionId && question_text) {
      const [qExist] = await pool.query(
        `SELECT id FROM db_question WHERE stem = ? LIMIT 1`,
        [question_text]
      );
      if (qExist.length > 0) {
        finalQuestionId = qExist[0].id;
      }
    }
    
    if (existing.length > 0) {
      // 更新已有错题
      await pool.query(
        `UPDATE db_wrong_question SET 
          wrong_count = wrong_count + 1, 
          user_answer = ?,
          last_wrong_at = NOW(),
          update_time = NOW()
         WHERE id = ?`,
        [user_answer || '未作答', existing[0].id]
      );
      return existing[0].id;
    } else {
      // 插入新错题
      const [result] = await pool.query(`
        INSERT INTO db_wrong_question (
          user_id, 
          question_id, 
          wrong_count, 
          user_answer,
          mastered,
          note,
          last_wrong_at,
          create_time
        ) VALUES (?, ?, 1, ?, 0, ?, NOW(), NOW())
      `, [
        user_id, 
        finalQuestionId || null,
        user_answer || '未作答',
        note || ''
      ]);
      
      // 如果提供了科目和分类信息，但 question_id 为空，尝试更新 db_question 表
      if (!finalQuestionId && course && question_text) {
        // 检查是否已存在相似题目
        const [qExist] = await pool.query(
          `SELECT id FROM db_question WHERE stem = ? LIMIT 1`,
          [question_text]
        );
        if (qExist.length === 0) {
          // 插入新题目到 db_question
          await pool.query(`
            INSERT INTO db_question (
              subject, knowledge_point, stem, answer, analysis, source, status
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
          `, [
            course || '数据结构',
            category || '概念不清',
            question_text,
            correct_answer || '',
            '暂无详细解析',
            source || 'manual'
          ]);
        }
      }
      
      return result.insertId;
    }
  },

  /**
   * 标记错题为已掌握
   */
  async markMastered(id) {
    await pool.query(
      `UPDATE db_wrong_question SET 
        mastered = 1, 
        mastered_at = NOW(),
        update_time = NOW() 
       WHERE id = ?`,
      [id]
    );
  },

  /**
   * 删除错题
   */
  async deleteWrongQuestion(id) {
    await pool.query(
      `DELETE FROM db_wrong_question WHERE id = ?`,
      [id]
    );
  },

  /**
   * 获取错题统计（按科目分类）
   */
  async getWrongQuestionStats(userId) {
    const [rows] = await pool.query(`
      SELECT 
        q.subject AS course,
        COUNT(w.id) AS count,
        SUM(CASE WHEN w.mastered = 1 THEN 1 ELSE 0 END) AS mastered_count
      FROM db_wrong_question w
      LEFT JOIN db_question q ON w.question_id = q.id
      WHERE w.user_id = ?
      GROUP BY q.subject
    `, [userId]);
    return rows;
  },

  /**
   * 获取错题统计（按错题类别）
   */
  async getWrongQuestionCategoryStats(userId) {
    const [rows] = await pool.query(`
      SELECT 
        q.knowledge_point AS category,
        COUNT(w.id) AS count
      FROM db_wrong_question w
      LEFT JOIN db_question q ON w.question_id = q.id
      WHERE w.user_id = ?
      GROUP BY q.knowledge_point
    `, [userId]);
    return rows;
  },

  // ========== 学习计划 ==========

  /**
   * 保存学习计划
   */
  async saveLearningPlan(data) {
    const [existing] = await pool.query(
      `SELECT id FROM db_learning_plan 
       WHERE user_id = ? AND status = 1`,
      [data.user_id]
    );
    
    const metadata = {
      ...(data.ai_metadata || {}),
      tasks: data.tasks || [],
      generatedAt: new Date().toISOString(),
      date: data.date || new Date().toISOString().split('T')[0]
    };
    
    if (existing.length > 0) {
      await pool.query(`
        UPDATE db_learning_plan SET 
          name = ?,
          total_days = ?,
          daily_study_minutes = ?,
          progress_percent = ?,
          task_total = ?,
          task_done = ?,
          ai_metadata = ?,
          update_time = NOW()
        WHERE id = ?
      `, [
        data.name || '学习计划',
        data.total_days || 30,
        data.daily_study_minutes || 120,
        data.progress_percent || 0,
        data.task_total || (data.tasks ? data.tasks.length : 0),
        data.task_done || 0,
        JSON.stringify(metadata),
        existing[0].id
      ]);
      return existing[0].id;
    } else {
      const [result] = await pool.query(`
        INSERT INTO db_learning_plan (
          user_id, name, plan_type, total_days, 
          start_date, daily_study_minutes, plan_source,
          status, progress_percent, task_total, task_done,
          ai_metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.user_id,
        data.name || '学习计划',
        data.plan_type || 'ai',
        data.total_days || 30,
        data.start_date || new Date().toISOString().split('T')[0],
        data.daily_study_minutes || 120,
        data.plan_source || 'entrance_test',
        1,
        0,
        data.tasks ? data.tasks.length : 0,
        0,
        JSON.stringify(metadata)
      ]);
      return result.insertId;
    }
  },

  /**
   * 获取学习计划
   */
  async getLearningPlan(userId, date) {
    const [rows] = await pool.query(
      `SELECT * FROM db_learning_plan 
       WHERE user_id = ? AND status = 1 
       ORDER BY create_time DESC LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  /**
   * 获取学习计划 by id
   */
  async getLearningPlanById(planId) {
    const [rows] = await pool.query(
      `SELECT * FROM db_learning_plan WHERE id = ?`,
      [planId]
    );
    return rows[0] || null;
  },

  /**
   * 更新学习计划
   */
  async updateLearningPlan(planId, data) {
    const updates = [];
    const values = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.progress_percent !== undefined) {
      updates.push('progress_percent = ?');
      values.push(data.progress_percent);
    }
    if (data.task_total !== undefined) {
      updates.push('task_total = ?');
      values.push(data.task_total);
    }
    if (data.task_done !== undefined) {
      updates.push('task_done = ?');
      values.push(data.task_done);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.ai_metadata !== undefined) {
      updates.push('ai_metadata = ?');
      values.push(JSON.stringify(data.ai_metadata));
    }
    
    if (updates.length === 0) return;
    
    values.push(planId);
    await pool.query(
      `UPDATE db_learning_plan SET ${updates.join(', ')}, update_time = NOW() WHERE id = ?`,
      values
    );
  },

  /**
   * 获取用户本周学习计划
   */
  async getWeekPlans(userId, startDate, endDate) {
    const [rows] = await pool.query(`
      SELECT * FROM db_learning_plan
      WHERE user_id = ? AND status = 1
      ORDER BY create_time DESC
      LIMIT 1
    `, [userId]);
    return rows;
  },

  /**
   * 获取学习日历
   */
  async getStudyCalendar(userId, year, month) {
    try {
      const [rows] = await pool.query(`
        SELECT DATE(test_time) as study_date, 
               COUNT(*) as study_count,
               SUM(duration_seconds) / 60 as total_minutes
        FROM db_user_test
        WHERE user_id = ? AND YEAR(test_time) = ? AND MONTH(test_time) = ?
        GROUP BY DATE(test_time)
      `, [userId, year, month]);
      return rows;
    } catch (error) {
      console.warn('获取学习日历失败:', error.message);
      return [];
    }
  },

  /**
   * 保存每日任务
   */
  async saveDailyTasks(planId, date, tasks) {
    const [plan] = await pool.query(
      `SELECT ai_metadata FROM db_learning_plan WHERE id = ?`,
      [planId]
    );
    
    let metadata = {};
    try {
      metadata = plan[0]?.ai_metadata ? JSON.parse(plan[0].ai_metadata) : {};
    } catch (e) {
      metadata = {};
    }
    
    metadata.daily_tasks = metadata.daily_tasks || {};
    metadata.daily_tasks[date] = tasks;
    
    await pool.query(
      `UPDATE db_learning_plan SET ai_metadata = ? WHERE id = ?`,
      [JSON.stringify(metadata), planId]
    );
  },

  /**
   * 获取每日任务
   */
  async getDailyTasks(planId, date) {
    const [plan] = await pool.query(
      `SELECT ai_metadata FROM db_learning_plan WHERE id = ?`,
      [planId]
    );
    
    if (!plan[0]?.ai_metadata) return null;
    
    try {
      const metadata = JSON.parse(plan[0].ai_metadata);
      return metadata.daily_tasks?.[date] || null;
    } catch (e) {
      return null;
    }
  }
};