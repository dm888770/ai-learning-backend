const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { softAuth } = require('../middleware/auth');

router.get('/latest', courseController.getLatestCourses);
router.get('/detail', softAuth, courseController.getCourseDetail);
router.get('/favorites', softAuth, courseController.getUserFavorites);
router.post('/favorite/toggle', softAuth, courseController.toggleCourseFavorite);
router.post('/click/record', softAuth, courseController.recordCourseClick);
router.post('/view/record', softAuth, courseController.recordCourseView);
router.get('/history', softAuth, courseController.getUserViewHistory);

module.exports = router;
