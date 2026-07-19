const express = require('express');
const router = express.Router();
const testController = require('../controllers/test.controller');
const { softAuth } = require('../middleware/auth');

router.post('/submit', softAuth, testController.submitTest);
router.get('/history', softAuth, testController.getTestHistory);
router.get('/latest', softAuth, testController.getLatestTest);

module.exports = router;
