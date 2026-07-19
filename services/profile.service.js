/**
 * profile.service.js - 用户画像业务层（增强版）
 */
const profileRepository = require('../repositories/profile.repository');
const testRepository = require('../repositories/test.repository');
const recommendRepository = require('../repositories/recommend.repository');
const { safeParse } = require('../utils/json');

const FORMAL_TEST_TYPES = ['knowledge', '408测评', 'voice', 'scan'];
const DEFAULT_SUBJECTS = ['数据结构', '计算机网络', '操作系统', '计算机组成原理'];

module.exports = {
  /**
   * 🔧 核心方法：生成/更新用户画像（增强版）
   * 综合所有测评数据、标签、语音、扫描结果
   */
  async generateProfile(userId) {
    console.log('🎨 开始生成用户画像:', userId);

    // 1. 获取所有测评数据
    const allTests = await testRepository.findAllHistory(userId);
    
    // 2. 获取兴趣标签
    const tags = await recommendRepository.findLabels(userId, 'interest');
    
    // 3. 筛选知识测评（knowledge 类型）
    const knowledgeTests = allTests.filter(t => 
      t.test_type === 'knowledge' || t.test_type === '408测评'
    );
    
    // 4. 获取语音和扫描数据
    const voice = allTests.find(t => t.test_type === 'voice');
    const scan = allTests.find(t => t.test_type === 'scan');

    console.log(`📊 找到 ${knowledgeTests.length} 条知识测评, ${tags.length} 个标签`);

    // 如果没有任何数据，创建默认画像
    if (knowledgeTests.length === 0 && tags.length === 0 && !voice && !scan) {
      const defaultProfile = this._buildDefaultProfile(tags);
      await profileRepository.upsert(userId, defaultProfile);
      return defaultProfile;
    }

    // 5. 计算各科分数
    const subjectScores = Object.fromEntries(DEFAULT_SUBJECTS.map(s => [s, 0]));
    const subjectCount = { ...subjectScores };
    let totalScoreSum = 0;
    let highestScore = 0;
    let latestScore = 0;
    const allWeakPoints = new Set();
    const allStrongPoints = new Set();
    const trendData = [];

    // 6. 处理知识测评数据
    for (const test of knowledgeTests) {
      totalScoreSum += test.user_score;
      latestScore = test.user_score;
      if (test.user_score > highestScore) highestScore = test.user_score;
      trendData.unshift({ date: test.test_time, score: test.user_score });

      const detail = safeParse(test.knowledge_detail, {});
      for (const [subject, score] of Object.entries(detail)) {
        // 查找匹配的科目
        let matchedSubject = null;
        for (const defaultSubj of DEFAULT_SUBJECTS) {
          if (subject.includes(defaultSubj) || defaultSubj.includes(subject)) {
            matchedSubject = defaultSubj;
            break;
          }
        }
        if (matchedSubject) {
          subjectScores[matchedSubject] += score;
          subjectCount[matchedSubject]++;
          if (score < 60) allWeakPoints.add(matchedSubject);
          if (score >= 80) allStrongPoints.add(matchedSubject);
        }
      }
    }

    // 7. 计算平均分
    const avgTotalScore = knowledgeTests.length > 0 
      ? Math.round(totalScoreSum / knowledgeTests.length) 
      : 0;

    const finalSubjectScores = {};
    for (const subject of DEFAULT_SUBJECTS) {
      finalSubjectScores[subject] =
        subjectCount[subject] > 0
          ? Math.round(subjectScores[subject] / subjectCount[subject])
          : 40;
    }

    // 8. 从语音分析中提取学习目标和关键词
    if (voice) {
      const v = safeParse(voice.knowledge_detail, {});
      if (v.voice_analysis) {
        // 提取关键词作为薄弱点
        const keywords = this._extractKeywords(v.voice_analysis);
        keywords.forEach(k => allWeakPoints.add(k));
      }
    }

    // 9. 从扫描结果中提取知识点
    if (scan) {
      const s = safeParse(scan.knowledge_detail, {});
      if (s.scan_items && Array.isArray(s.scan_items)) {
        s.scan_items.forEach(item => {
          for (const subject of DEFAULT_SUBJECTS) {
            if (item.includes(subject) || subject.includes(item)) {
              allWeakPoints.add(subject);
            }
          }
        });
      }
      if (s.scan_recommendation) {
        // 将建议加入学习建议
      }
    }

    // 10. 加入兴趣标签（作为强项参考）
    for (const tag of tags) {
      // 如果标签对应某个科目，且该科目分数不低，则加入强项
      for (const subject of DEFAULT_SUBJECTS) {
        if (tag.label_name.includes(subject) || subject.includes(tag.label_name)) {
          if (finalSubjectScores[subject] >= 60) {
            allStrongPoints.add(subject);
          }
          break;
        }
      }
    }

    // 11. 等级计算
    const { level, levelName } = this._calcLevel(avgTotalScore);

    // 12. 构建6维能力分数
    const dimensionScores = [
      finalSubjectScores['数据结构'] || 40,
      finalSubjectScores['计算机网络'] || 40,
      finalSubjectScores['操作系统'] || 40,
      finalSubjectScores['计算机组成原理'] || 40,
      Math.min(100, avgTotalScore + 10),
      Math.min(100, avgTotalScore + 5)
    ];

    // 13. 学习风格
    const learningStyle = {
      visual: Math.min(95, 60 + Math.floor(avgTotalScore / 6)),
      auditory: Math.min(90, 45 + Math.floor(avgTotalScore / 8)),
      reading: Math.min(90, 55 + Math.floor(avgTotalScore / 7)),
      kinesthetic: Math.min(95, 50 + Math.floor(avgTotalScore / 5))
    };

    // 14. 构建学习建议
    const subjectList = Object.entries(finalSubjectScores);
    const weakest = subjectList.reduce((a, b) => (a[1] < b[1] ? a : b), ['', 100]);
    let studyAdvice = `根据你的测评结果，综合得分${avgTotalScore}分，处于${levelName}。建议从${weakest[0]}开始加强学习。`;

    // 加入语音建议
    if (voice) {
      const v = safeParse(voice.knowledge_detail, {});
      if (v.voice_analysis) {
        studyAdvice += ` 学习目标：${String(v.voice_analysis).substring(0, 60)}。`;
      }
    }
    // 加入扫描建议
    if (scan) {
      const s = safeParse(scan.knowledge_detail, {});
      if (s.scan_recommendation) {
        studyAdvice += ` 试卷分析建议：${String(s.scan_recommendation).substring(0, 60)}。`;
      }
    }

    // 15. 推荐方向
    let recommendDirections = Array.from(allWeakPoints).slice(0, 4);
    if (recommendDirections.length === 0) {
      recommendDirections = [...DEFAULT_SUBJECTS];
    }

    // 16. 构建完整画像
    const profile = {
      total_score: avgTotalScore,
      level,
      level_name: levelName,
      dimension_scores: dimensionScores,
      subject_scores: finalSubjectScores,
      weak_points: Array.from(allWeakPoints).slice(0, 10),
      strong_points: Array.from(allStrongPoints).slice(0, 5),
      learning_style: learningStyle,
      interest_tags: tags.map(t => t.label_name),
      test_count: knowledgeTests.length,
      avg_score: avgTotalScore,
      highest_score: highestScore,
      latest_score: latestScore,
      improvement_rate: knowledgeTests.length > 1 
        ? Math.round(((knowledgeTests[0]?.user_score || 0) - (knowledgeTests[knowledgeTests.length-1]?.user_score || 0)) / (knowledgeTests[knowledgeTests.length-1]?.user_score || 1) * 100) 
        : 0,
      trend_data: trendData.slice(0, 10),
      recommend_directions: recommendDirections,
      study_advice: studyAdvice
    };

    await profileRepository.upsert(userId, profile);
    console.log('✅ 画像更新成功:', { 
      user_id: userId, 
      level, 
      levelName, 
      totalScore: avgTotalScore,
      weakPoints: profile.weak_points.length,
      strongPoints: profile.strong_points.length
    });
    return profile;
  },

  /**
   * 等级换算
   */
  _calcLevel(avgScore) {
    if (avgScore >= 80) return { level: 'advanced', levelName: '进阶级' };
    if (avgScore >= 60) return { level: 'intermediate', levelName: '中级' };
    return { level: 'beginner', levelName: '入门级' };
  },

  /**
   * 无测评时的默认画像
   */
  _buildDefaultProfile(tags) {
    return {
      total_score: 0,
      level: 'beginner',
      level_name: '入门级',
      dimension_scores: [40, 40, 40, 40, 40, 40],
      subject_scores: Object.fromEntries(DEFAULT_SUBJECTS.map(s => [s, 40])),
      weak_points: [...DEFAULT_SUBJECTS],
      strong_points: [],
      learning_style: { visual: 70, auditory: 50, reading: 60, kinesthetic: 65 },
      interest_tags: tags.map(t => t.label_name),
      test_count: 0,
      avg_score: 0,
      highest_score: 0,
      latest_score: 0,
      improvement_rate: 0,
      trend_data: [],
      recommend_directions: [...DEFAULT_SUBJECTS],
      study_advice: '完成知识测评后，我们将为你生成个性化学习建议'
    };
  },

  /**
   * 从文本中提取关键词
   */
  _extractKeywords(text) {
    const keywords = [];
    const subjectMap = {
      '数据结构': ['数据结构', '链表', '树', '图', '排序', '查找', '栈', '队列', '二叉树', 'AVL', '红黑树'],
      '计算机网络': ['网络', 'TCP', 'IP', 'HTTP', 'DNS', '协议', '路由器', '交换机'],
      '操作系统': ['操作系统', '进程', '内存', '文件', '调度', '死锁', '线程', '虚拟内存'],
      '计算机组成原理': ['组成原理', 'CPU', '指令', '存储', '总线', '中断', 'Cache', '流水线']
    };
    
    for (const [subject, words] of Object.entries(subjectMap)) {
      for (const word of words) {
        if (text.includes(word)) {
          keywords.push(subject);
          break;
        }
      }
    }
    return keywords;
  },

  // ========= 以下是原有方法保持不变 =========
  async getUserProfile(userId) {
    const row = await profileRepository.findByUserId(userId);
    if (!row) return null;
    return {
      ...row,
      dimensionScores: safeParse(row.dimensionScores, []),
      weakPoints: safeParse(row.weakPoints, [])
    };
  },

  async getFullProfile(userId) {
    const profile = await profileRepository.findByUserId(userId);
    const interests = await this.getInterestTags(userId);
    const voice = await this.getVoiceAnalysis(userId);
    const scan = await this.getScanResult(userId);
    const lastTestRow = await testRepository.findLatest(userId, ['knowledge', '408测评']);
    const allTests = await testRepository.findAllHistory(userId);

    let profileData = null;
    if (profile) {
      profileData = {
        ...profile,
        dimensionScores: safeParse(profile.dimensionScores, [40, 40, 40, 40, 40, 40]),
        weakPoints: safeParse(profile.weakPoints, [])
      };
    }

    return {
      profile: profileData,
      interests,
      voice,
      scan,
      lastTest: lastTestRow
        ? {
            score: lastTestRow.user_score,
            detail: safeParse(lastTestRow.knowledge_detail, {}),
            time: lastTestRow.test_time
          }
        : null,
      testHistory: allTests.map(t => ({
        id: t.id,
        test_type: t.test_type,
        user_score: t.user_score,
        knowledge_detail: safeParse(t.knowledge_detail, {}),
        test_time: t.test_time
      }))
    };
  },

  async getInterestTags(userId) {
    const rows = await recommendRepository.findLabels(userId, 'interest');
    return rows.map(r => r.label_name);
  },

  async getVoiceAnalysis(userId) {
    const row = await testRepository.findLatest(userId, ['voice']);
    if (!row) return null;
    const data = safeParse(row.knowledge_detail, {});
    return {
      voice_text: data.voice_text,
      voice_analysis: data.voice_analysis
    };
  },

  async getScanResult(userId) {
    const row = await testRepository.findLatest(userId, ['scan']);
    if (!row) return null;
    const data = safeParse(row.knowledge_detail, {});
    return {
      scan_items: data.scan_items,
      scan_recommendation: data.scan_recommendation
    };
  },

  async getEnhancedProfile(userId) {
    const profile = await profileRepository.findByUserId(userId);
    const recentTests = await testRepository.findRecent(userId, ['knowledge', '408测评'], 5);

    let weakPoints = [];
    let dimensionScores = [];
    if (profile) {
      weakPoints = safeParse(profile.weakPoints, []);
      dimensionScores = safeParse(profile.dimensionScores, [40, 40, 40, 40, 40, 40]);
    }

    let trend = 'stable';
    let trendPercent = 0;
    if (recentTests.length >= 2) {
      const latest = recentTests[0].user_score;
      const previous = recentTests[1].user_score;
      if (latest > previous) {
        trend = 'up';
        trendPercent = previous > 0 ? Math.round(((latest - previous) / previous) * 100) : 0;
      } else if (latest < previous) {
        trend = 'down';
        trendPercent = previous > 0 ? Math.round(((previous - latest) / previous) * 100) : 0;
      }
    }

    const avgScore =
      recentTests.length > 0
        ? Math.round(recentTests.reduce((s, t) => s + t.user_score, 0) / recentTests.length)
        : 0;

    return {
      profile,
      weakPoints,
      dimensionScores,
      recentTests,
      trend,
      trendPercent,
      totalTests: recentTests.length,
      avgScore,
      latestScore: recentTests[0]?.user_score || 0
    };
  },

  async getWeakPointsAnalysis(userId) {
    const profile = await profileRepository.findByUserId(userId);
    let weakPoints = [];
    let dimensionScores = [];
    let latestScore = 0;
    if (profile) {
      weakPoints = safeParse(profile.weakPoints, []);
      dimensionScores = safeParse(profile.dimensionScores, []);
      latestScore = profile.latest_score || 0;
    }
    const analysis = weakPoints.map((weak, index) => ({
      id: index + 1,
      subject: weak,
      severity: this._getSeverity(weak, dimensionScores),
      suggestion: `📖 建议加强对${weak}基础知识的学习，多做相关练习题。`,
      priority: index < 3 ? 'high' : 'normal'
    }));
    return {
      weakPoints,
      analysis,
      dimensionScores,
      totalWeakPoints: weakPoints.length,
      priority: weakPoints.slice(0, 3),
      latestScore
    };
  },

  _getSeverity(subject, dimensionScores) {
    const idx = { '数据结构': 0, '计算机网络': 1, '操作系统': 2, '计算机组成原理': 3 }[subject];
    if (idx !== undefined && dimensionScores[idx]) {
      const score = dimensionScores[idx];
      if (score < 50) return 'high';
      if (score < 70) return 'medium';
    }
    return 'low';
  },

  async getLearningReport(userId) {
    const profile = await profileRepository.findByUserId(userId);
    const allTests = await testRepository.findAllHistory(userId);
    const interests = await this.getInterestTags(userId);

    let weakPoints = [];
    let strongPoints = [];
    if (profile) {
      weakPoints = safeParse(profile.weakPoints, []);
      strongPoints = safeParse(profile.strongPoints, []);
    }

    return {
      summary: {
        totalTests: allTests.length,
        avgScore: allTests.length > 0
          ? Math.round(allTests.reduce((s, t) => s + t.user_score, 0) / allTests.length)
          : 0,
        latestScore: allTests[0]?.user_score || 0,
        weakPointsCount: weakPoints.length,
        strongPointsCount: strongPoints.length,
        interestTagsCount: interests.length
      },
      weakPoints,
      strongPoints,
      interestTags: interests,
      recentTests: allTests.slice(0, 5),
      recommendation: weakPoints.length > 0
        ? `建议优先加强${weakPoints.slice(0, 3).join('、')}的学习`
        : '继续保持学习节奏，可以尝试更高难度的内容',
      generateTime: new Date().toISOString()
    };
  }
};