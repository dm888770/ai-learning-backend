/**
 * diagnosis.controller.js
 */
const profileRepository = require('../repositories/profile.repository');
const profileService = require('../services/profile.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

function getUserId(req) {
  return req.user?.id || req.body?.user_id || req.query?.user_id;
}

module.exports = {
  /**
   * POST /diagnosis/profile/save
   * 保存前端生成的画像
   */
  saveDiagnosisProfile: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) throw { statusCode: 400, message: '缺少 user_id' };

    const { levelName, totalScore, abilities, strength, weakness, advice } = req.body || {};

    const dimToSubject = {
      '数据结构': '数据结构',
      '算法设计': '数据结构',
      '机器学习': '机器学习',
      '深度学习': '深度学习',
      '硬件基础': '计算机组成原理',
      '操作系统': '操作系统',
      '软件工程': '软件工程',
      '计算机网络': '计算机网络'
    };

    const subjectScores = {};
    const subjectCounts = {};
    const dimScores = [];

    if (Array.isArray(abilities)) {
      for (const ability of abilities) {
        const subject = dimToSubject[ability.name];
        if (subject) {
          if (!subjectScores[subject]) {
            subjectScores[subject] = 0;
            subjectCounts[subject] = 0;
          }
          subjectScores[subject] += ability.score;
          subjectCounts[subject]++;
        }
        dimScores.push(ability.score);
      }
    }

    const allSubjects = ['数据结构', '计算机网络', '操作系统', '计算机组成原理'];
    for (const subj of allSubjects) {
      if (!subjectScores[subj]) subjectScores[subj] = 40;
    }

    const mergedSubjectScores = {
      '数据结构': subjectScores['数据结构'] || 40,
      '计算机网络': subjectScores['计算机网络'] || 40,
      '操作系统': subjectScores['操作系统'] || 40,
      '计算机组成原理': subjectScores['计算机组成原理'] || 40
    };

    while (dimScores.length < 8) dimScores.push(40);

    let level = 'beginner', levelNameDb = '入门级';
    if (totalScore >= 75) { level = 'advanced'; levelNameDb = '进阶级'; }
    else if (totalScore >= 50) { level = 'intermediate'; levelNameDb = '中级'; }

    const profile = {
      total_score: totalScore || 0,
      level,
      level_name: levelNameDb,
      dimension_scores: dimScores,
      subject_scores: mergedSubjectScores,
      weak_points: weakness ? [weakness] : [],
      strong_points: strength ? [strength] : [],
      learning_style: { visual: 70, auditory: 50, reading: 60, kinesthetic: 65 },
      interest_tags: [],
      test_count: 1,
      avg_score: totalScore || 0,
      highest_score: totalScore || 0,
      latest_score: totalScore || 0,
      improvement_rate: 0,
      trend_data: [{ date: new Date().toISOString(), score: totalScore || 0 }],
      recommend_directions: [],
      study_advice: advice || '继续完成更多测评模块以获得更精准的建议'
    };

    await profileRepository.upsert(userId, profile);
    console.log('💾 诊断画像已保存:', { userId, totalScore, level: levelName });
    return success(res, null, '画像保存成功');
  }),

  /**
   * GET /diagnosis/profile/load
   * 加载画像并转换为前端格式
   */
  loadDiagnosisProfile: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return success(res, null);

    const row = await profileRepository.findByUserId(userId);
    if (!row) return success(res, null);

    const dimensionScores = Array.isArray(row.dimension_scores)
      ? row.dimension_scores
      : (() => { try { return JSON.parse(row.dimension_scores || '[]'); } catch { return []; } })();

    const dimNames = ['数据结构', '算法设计', '机器学习', '深度学习', '硬件基础', '操作系统', '软件工程', '计算机网络'];
    const abilities = dimNames.map((name, i) => ({
      name,
      score: dimensionScores[i] !== undefined ? dimensionScores[i] : 40
    }));

    let levelName = '未评估';
    const avgScore = row.total_score || 0;
    if (avgScore >= 75) levelName = '全栈达人';
    else if (avgScore >= 50) levelName = '稳步进阶';
    else if (avgScore > 0) levelName = '基础入门';

    const weakPoints = Array.isArray(row.weak_points)
      ? row.weak_points
      : (() => { try { return JSON.parse(row.weak_points || '[]'); } catch { return []; } })();
    const strongPoints = Array.isArray(row.strong_points)
      ? row.strong_points
      : (() => { try { return JSON.parse(row.strong_points || '[]'); } catch { return []; } })();

    return success(res, {
      levelName,
      totalScore: avgScore,
      abilities,
      strength: strongPoints.length > 0 ? strongPoints[0] : '待完成评估',
      weakness: weakPoints.length > 0 ? weakPoints[0] : '待完成评估',
      advice: row.study_advice || '请先完成智能评估或任意测评模块'
    });
  })
};