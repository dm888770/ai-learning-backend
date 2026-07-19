// routes/community.routes.js
const express = require('express');
const router = express.Router();
const communityController = require('../controllers/community.controller');
const commentController = require('../controllers/comment.controller');
const likeController = require('../controllers/like.controller');
const { softAuth } = require('../middleware/auth');

// ========== 帖子相关 ==========
router.get('/posts', softAuth, communityController.getPostList);
router.get('/posts/:id', softAuth, communityController.getPostDetail);
router.post('/posts', softAuth, communityController.createPost);
router.put('/posts/:id', softAuth, communityController.updatePost);
router.delete('/posts/:id', softAuth, communityController.deletePost);

// ========== 评论相关 ==========
router.get('/comments/post/:postId', softAuth, commentController.getComments);
router.post('/comments', softAuth, commentController.createComment);
router.delete('/comments/:id', softAuth, commentController.deleteComment);

// ========== 点赞相关 ==========
router.post('/like/toggle', softAuth, likeController.toggleLike);
router.get('/like/status', softAuth, likeController.getLikeStatus);

// ========== 话题相关 ==========
router.get('/topics', communityController.getTopics);
router.get('/topics/hot', communityController.getHotTopics);

module.exports = router;