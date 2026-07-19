const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');
const { softAuth } = require('../middleware/auth');

router.post('/generate', softAuth, planController.generatePlan);
router.post('/generate/ai', softAuth, planController.generateLearningPlanByAI);
router.post('/studyplan/generate', softAuth, planController.generateStudyPlan);

module.exports = router;
