// routes/index.js - 完整修复版
const express = require('express');
const router = express.Router();
const { softAuth } = require('../middleware/auth');

// ========== 导入所有 Controller（只声明一次） ==========
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');
const testController = require('../controllers/test.controller');
const courseController = require('../controllers/course.controller');
const recommendController = require('../controllers/recommend.controller');
const planController = require('../controllers/plan.controller');
const aiController = require('../controllers/ai.controller');
const diagnosisController = require('../controllers/diagnosis.controller');
const digitalHumanController = require('../controllers/digitalHuman.controller');
const ttsController = require('../controllers/tts.controller');

// ========== 导入社区路由 ==========
const communityRouter = require('./community.routes');

// ========== 健康检查 ==========
router.get('/test', (req, res) => {
  res.json({ code: 200, msg: '后端服务正常', data: null });
});

// ========== 认证 ==========
router.post('/auth/register', softAuth, authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/user', softAuth, authController.getUserInfo);

// ========== 测评 ==========
router.post('/test/submit', softAuth, testController.submitTest);
router.get('/test/history', softAuth, testController.getTestHistory);
router.get('/test/latest', softAuth, testController.getLatestTest);

// ========== 用户画像 / 标签 / 语音 / 扫描 ==========
router.get('/user/profile', softAuth, userController.getUserProfile);
router.post('/user/profile/generate', softAuth, userController.generateUserProfile);
router.get('/user/profile/full', softAuth, userController.getFullProfile);
router.get('/user/profile/enhanced', softAuth, userController.getEnhancedProfile);
router.post('/user/profile/update', softAuth, userController.forceUpdateProfile);
router.get('/user/weakpoints/analysis', softAuth, userController.getWeakPointsAnalysis);
router.get('/user/learning-report', softAuth, userController.getLearningReport);

router.post('/user/tags', softAuth, userController.saveInterestTags);
router.post('/user/tags/batch', softAuth, userController.batchSaveTags);
router.get('/user/tags', softAuth, userController.getInterestTags);
router.get('/user/tags/detailed', softAuth, userController.getInterestTagsDetailed);
router.post('/user/tags/weight', softAuth, userController.updateTagWeight);
router.delete('/user/tags', softAuth, userController.deleteTag);

router.post('/user/voice', softAuth, userController.saveVoiceAnalysis);
router.get('/user/voice', softAuth, userController.getVoiceAnalysis);
router.post('/user/scan', softAuth, userController.saveScanResult);
router.get('/user/scan', softAuth, userController.getScanResult);

// ============================================================
// ========== 个人中心相关（新增） ==========
// ============================================================
router.get('/user/profile/info', softAuth, userController.getUserInfo);
router.put('/user/profile/info', softAuth, userController.updateUserInfo);
router.get('/user/profile/stats', softAuth, userController.getUserStats);
router.post('/user/profile/stats', softAuth, userController.updateUserStats);
router.get('/user/profile/milestones', softAuth, userController.getMilestones);
router.get('/user/profile/achievements', softAuth, userController.getAchievements);
router.get('/user/profile/records', softAuth, userController.getStudyRecords);
router.get('/user/profile/review', softAuth, userController.getReviewStats);
router.get('/user/profile/full', softAuth, userController.getFullProfileData);
router.get('/user/profile/courses', softAuth, userController.getCourseProgress);
router.post('/user/profile/courses', softAuth, userController.updateCourseProgress);

// ========== 课程相关 ==========
router.get('/courses/list', softAuth, courseController.getCourseList);
router.get('/courses/detail/:id', softAuth, courseController.getCourseDetail);
router.get('/courses/categories', courseController.getCategories);
router.get('/courses/recommended', softAuth, courseController.getRecommended);
router.get('/courses/hot', softAuth, courseController.getHotCourses);
router.get('/courses/search', softAuth, courseController.searchCourses);

// 课程进度
router.post('/courses/progress', softAuth, courseController.updateProgress);
router.get('/courses/progress/all', softAuth, courseController.getUserProgress);

// 收藏
router.post('/courses/favorite/toggle', softAuth, courseController.toggleFavorite);
router.get('/courses/favorites', softAuth, courseController.getFavorites);

// 错题
router.post('/courses/wrong/add', softAuth, courseController.addWrongQuestion);
router.get('/courses/wrong/list', softAuth, courseController.getWrongQuestions);
router.post('/courses/wrong/mastered', softAuth, courseController.markMastered);

// 学习计划
router.post('/courses/plan/save', softAuth, courseController.saveLearningPlan);
router.get('/courses/plan/day', softAuth, courseController.getDayPlan);
router.get('/courses/plan/week', softAuth, courseController.getWeekPlans);
router.get('/courses/calendar', softAuth, courseController.getCalendar);

// ========== 课程推荐 ==========
router.get('/courses/recommend', softAuth, recommendController.recommendCourses);
router.get('/courses/recommend/new', softAuth, recommendController.getRecommendedCourses);

// ========== 推荐 / AI 建议 ==========
router.post('/recommend/advice', softAuth, recommendController.getAIAdvice);

// ========== 题目生成 ==========
router.post('/questions/generate', softAuth, aiController.generateQuestions);
router.post('/questions/personalized', softAuth, recommendController.generatePersonalizedQuestions);
router.post('/questions/variant/generate', softAuth, recommendController.generateVariantQuestions);

// ========== 学习计划 ==========
router.post('/plan/generate', softAuth, planController.generatePlan);
router.post('/plan/generate/ai', softAuth, planController.generateLearningPlanByAI);
router.post('/studyplan/generate', softAuth, planController.generateStudyPlan);

// ========== AI 对话 ==========
router.post('/ai/chat', softAuth, aiController.aiChat);
router.post('/ai/voice-analysis', softAuth, aiController.analyzeVoice);
router.post('/ai/stage-quiz/generate', softAuth, aiController.generateStageQuiz);
router.post('/ai/mindmap/generate', softAuth, aiController.generateMindmap);

// ========== 诊断画像 ==========
router.post('/diagnosis/profile/save', softAuth, diagnosisController.saveDiagnosisProfile);
router.get('/diagnosis/profile/load', softAuth, diagnosisController.loadDiagnosisProfile);

// ========== 讯飞数字人 ==========
router.post('/digital-human/generate', softAuth, digitalHumanController.generateVideo);
router.post('/digital-human/query', softAuth, digitalHumanController.queryVideo);

// ========== TTS 语音合成 ==========
router.post('/tts/generate', softAuth, ttsController.generate);
router.get('/tts/voices', ttsController.getVoices);

// ========== 🔧 社区路由（挂载到 /community） ==========
router.use('/community', communityRouter);

console.log('✅ 所有路由已注册');
module.exports = router;