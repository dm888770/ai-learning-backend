const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { softAuth } = require('../middleware/auth');

router.post('/register', softAuth, authController.register);
router.post('/login', authController.login);
router.get('/user', softAuth, authController.getUserInfo);

module.exports = router;
