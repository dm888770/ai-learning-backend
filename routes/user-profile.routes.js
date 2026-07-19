// routes/user-profile.routes.js
const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/user-profile.controller');
const { softAuth } = require('../middleware/auth');

// ========== 用户信息 ==========
router.get('/info', softAuth, userProfileController.getUserInfo);
router.put('/info', softAuth, userProfileController.updateUserInfo);

// ========== 用户统计 ==========
router.get('/stats', softAuth, userProfileController.getUserStats);
router.post('/stats', softAuth, userProfileController.updateUserStats);

// ========== 课程进度 ==========
router.get('/courses', softAuth, userProfileController.getCourseProgress);
router.post('/courses', softAuth, userProfileController.updateCourseProgress);

// ========== 学习记录 ==========
router.get('/records', softAuth, userProfileController.getStudyRecords);
router.post('/records', softAuth, userProfileController.createStudyRecord);

// ========== 学习回顾 ==========
router.get('/review', softAuth, userProfileController.getReviewStats);

// ========== 学习日历 ==========
router.get('/calendar', softAuth, userProfileController.getStudyCalendar);

module.exports = router;