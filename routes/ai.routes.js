// routes/ai.routes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { softAuth } = require('../middleware/auth');

// AI 通用对话
router.post('/chat', softAuth, aiController.aiChat);

// 通用题目生成（兼容老接口）
router.post('/questions/generate', softAuth, aiController.generateQuestions);

// 🔧 阶段小测试生成
router.post('/stage-quiz/generate', softAuth, aiController.generateStageQuiz);

module.exports = router;