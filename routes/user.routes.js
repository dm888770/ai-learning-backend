// routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { softAuth } = require('../middleware/auth');

// ========== 兴趣标签 ==========
router.post('/tags', softAuth, userController.saveInterestTags);
router.post('/tags/batch', softAuth, userController.batchSaveTags);
router.get('/tags', softAuth, userController.getInterestTags);
router.get('/tags/detailed', softAuth, userController.getInterestTagsDetailed);
router.post('/tags/weight', softAuth, userController.updateTagWeight);
router.delete('/tags', softAuth, userController.deleteTag);

// ========== 语音分析 ==========
router.post('/voice', softAuth, userController.saveVoiceAnalysis);
router.get('/voice', softAuth, userController.getVoiceAnalysis);

// ========== 试卷扫描 ==========
router.post('/scan', softAuth, userController.saveScanResult);
router.get('/scan', softAuth, userController.getScanResult);

// ========== 画像 ==========
router.get('/profile', softAuth, userController.getUserProfile);
router.post('/profile/generate', softAuth, userController.generateUserProfile);
router.get('/profile/full', softAuth, userController.getFullProfile);
router.get('/profile/enhanced', softAuth, userController.getEnhancedProfile);
router.post('/profile/update', softAuth, userController.forceUpdateProfile);
router.get('/weakpoints/analysis', softAuth, userController.getWeakPointsAnalysis);
router.get('/learning-report', softAuth, userController.getLearningReport);

module.exports = router;