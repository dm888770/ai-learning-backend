// controllers/community.controller.js
const communityRepository = require('../repositories/community.repository');
const commentRepository = require('../repositories/comment.repository');
const likeRepository = require('../repositories/like.repository');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

function getUserId(req) {
  return req.user?.id || req.body?.user_id || req.query?.user_id;
}

// ========== 辅助函数 ==========
function getDefaultAvatar(userId) {
  const colors = [
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    'linear-gradient(135deg, #3b82f6, #2563eb)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #06b6d4, #0891b2)',
    'linear-gradient(135deg, #f472b6, #ec4899)'
  ];
  return colors[(userId || 0) % colors.length] || colors[0];
}

function formatTime(time) {
  if (!time) return '刚刚';
  const now = new Date();
  const date = new Date(time);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
  return date.toLocaleDateString('zh-CN');
}

function hexToRgb(hex) {
  if (!hex) return '107, 114, 128';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return '107, 114, 128';
}

module.exports = {
  /**
   * GET /community/posts - 获取帖子列表
   */
  getPostList: asyncHandler(async (req, res) => {
    const { topic_id, keyword, page = 1, limit = 20 } = req.query;
    const data = await communityRepository.getPostList({
      topicId: topic_id,
      keyword,
      page,
      limit
    });

    const list = data.list.map(post => ({
      id: post.id,
      user_id: post.user_id,
      author: post.nickname || post.username || '用户',
      avatarBg: post.avatar || getDefaultAvatar(post.user_id),
      category_id: post.topic_id,
      categoryName: post.topic_name || '综合交流',
      title: post.title || '无标题',
      excerpt: post.content ? post.content.substring(0, 150) : '',
      likes: post.like_count || 0,
      liked: false,
      time: formatTime(post.create_time),
      tagBg: post.topic_color ? `rgba(${hexToRgb(post.topic_color)},0.12)` : 'rgba(107,114,128,0.12)',
      tagColor: post.topic_color || '#6b7280',
      comment_count: post.comment_count || 0,
      comments: []
    }));

    res.json({
      code: 0,
      data: {
        list,
        total: data.total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }),

  /**
   * GET /community/posts/:id - 获取帖子详情
   */
  getPostDetail: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = getUserId(req);

    const post = await communityRepository.getPostDetail(id);
    if (!post) {
      return res.status(404).json({ code: 404, message: '帖子不存在' });
    }

    await communityRepository.incrementViewCount(id);

    const comments = await commentRepository.getCommentsByPost(id);

    let isLiked = false;
    if (userId) {
      isLiked = await likeRepository.checkLiked(userId, 'post', id);
    }

    const result = {
      id: post.id,
      user_id: post.user_id,
      author: post.nickname || post.username || '用户',
      avatarBg: post.avatar || getDefaultAvatar(post.user_id),
      category_id: post.topic_id,
      categoryName: post.topic_name || '综合交流',
      title: post.title || '无标题',
      excerpt: post.content || '',
      likes: post.like_count || 0,
      liked: isLiked,
      time: formatTime(post.create_time),
      tagBg: post.topic_color ? `rgba(${hexToRgb(post.topic_color)},0.12)` : 'rgba(107,114,128,0.12)',
      tagColor: post.topic_color || '#6b7280',
      view_count: post.view_count || 0,
      comments: comments.map(c => ({
        id: c.id,
        user_id: c.user_id,
        author: c.nickname || c.username || '用户',
        bg: c.avatar || getDefaultAvatar(c.user_id),
        time: formatTime(c.create_time),
        text: c.content,
        likes: c.like_count || 0
      }))
    };

    res.json({ code: 0, data: result });
  }),

  /**
   * POST /community/posts - 发布帖子
   */
  createPost: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { topic_id, title, content, tags, post_type = 'normal', is_anonymous = 0 } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ code: 400, message: '内容不能为空' });
    }

    const postId = await communityRepository.createPost({
      user_id: userId,
      topic_id: topic_id || 5,
      title: title || '',
      content,
      tags,
      post_type,
      is_anonymous
    });

    res.json({
      code: 0,
      data: { id: postId },
      message: '发布成功'
    });
  }),

  /**
   * PUT /community/posts/:id - 更新帖子
   */
  updatePost: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { id } = req.params;
    const { topic_id, title, content, tags } = req.body;

    const post = await communityRepository.getPostDetail(id);
    if (!post) {
      return res.status(404).json({ code: 404, message: '帖子不存在' });
    }
    if (post.user_id !== userId) {
      return res.status(403).json({ code: 403, message: '无权修改此帖子' });
    }

    await communityRepository.updatePost(id, { topic_id, title, content, tags });

    res.json({ code: 0, message: '更新成功' });
  }),

  /**
   * DELETE /community/posts/:id - 删除帖子
   */
  deletePost: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { id } = req.params;
    const result = await communityRepository.deletePost(id, userId);

    if (!result) {
      return res.status(403).json({ code: 403, message: '无权删除此帖子' });
    }

    res.json({ code: 0, message: '删除成功' });
  }),

  /**
   * GET /community/topics - 获取话题列表
   */
  getTopics: asyncHandler(async (req, res) => {
    const topics = await communityRepository.getTopics();
    res.json({
      code: 0,
      data: topics.map(t => ({
        id: t.id,
        name: t.name,
        icon: t.icon || '📚',
        color: t.color || '#6b7280',
        bg: t.color ? `rgba(${hexToRgb(t.color)},0.12)` : 'rgba(107,114,128,0.12)',
        post_count: t.post_count || 0,
        is_hot: t.is_hot === 1,
        is_official: t.is_official === 1
      }))
    });
  }),

  /**
   * GET /community/topics/hot - 获取热门话题
   */
  getHotTopics: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 6;
    const topics = await communityRepository.getHotTopics(limit);
    res.json({
      code: 0,
      data: topics.map(t => ({
        id: t.id,
        name: t.name,
        icon: t.icon || '📚',
        color: t.color || '#6b7280',
        post_count: t.post_count || 0
      }))
    });
  })
};