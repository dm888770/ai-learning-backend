const express = require('express');
const router = express.Router();
const recommendController = require('../controllers/recommend.controller');
const { softAuth } = require('../middleware/auth');

// 课程推荐（新版 + 旧版都保留）
router.get('/courses/recommend', softAuth, recommendController.recommendCourses);
router.get('/courses/recommend/new', softAuth, recommendController.getRecommendedCourses);

// AI 建议
router.post('/advice', softAuth, recommendController.getAIAdvice);

// 个性化题目
router.post('/questions/personalized', softAuth, recommendController.generatePersonalizedQuestions);

module.exports = router;
