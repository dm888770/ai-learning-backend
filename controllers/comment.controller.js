// controllers/comment.controller.js
const commentRepository = require('../repositories/comment.repository');
const communityRepository = require('../repositories/community.repository');
const likeRepository = require('../repositories/like.repository');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

function getUserId(req) {
  return req.user?.id || req.body?.user_id || req.query?.user_id;
}

// ========== 辅助函数（移到外部，避免 this 绑定问题） ==========
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

module.exports = {
  /**
   * GET /community/comments/post/:postId - 获取评论列表
   */
  getComments: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = getUserId(req);

    const comments = await commentRepository.getCommentsByPost(postId);

    // 格式化并获取子评论
    const result = [];
    for (const comment of comments) {
      const children = await commentRepository.getChildComments(comment.id);
      result.push({
        id: comment.id,
        user_id: comment.user_id,
        // 修复：使用外部函数 formatTime，不用 this
        author: comment.nickname || comment.username || '用户',
        bg: comment.avatar || getDefaultAvatar(comment.user_id),
        time: formatTime(comment.create_time),
        text: comment.content,
        likes: comment.like_count || 0,
        children: children.map(c => ({
          id: c.id,
          user_id: c.user_id,
          author: c.nickname || c.username || '用户',
          bg: c.avatar || getDefaultAvatar(c.user_id),
          time: formatTime(c.create_time),
          text: c.content,
          reply_to: c.reply_to_username,
          likes: c.like_count || 0
        }))
      });
    }

    res.json({ code: 0, data: result });
  }),

  /**
   * POST /community/comments - 创建评论
   */
  createComment: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { post_id, content, parent_id, reply_to_user_id } = req.body;

    if (!post_id || !content || content.trim() === '') {
      return res.status(400).json({ code: 400, message: '内容不能为空' });
    }

    // 检查帖子是否存在
    const post = await communityRepository.getPostDetail(post_id);
    if (!post) {
      return res.status(404).json({ code: 404, message: '帖子不存在' });
    }

    // 如果是回复评论，检查父评论是否存在
    let rootId = null;
    if (parent_id) {
      const [parent] = await commentRepository.getCommentsByPost(post_id);
      rootId = parent_id;
    }

    const commentId = await commentRepository.createComment({
      post_id,
      user_id: userId,
      content,
      parent_id: parent_id || null,
      root_id: rootId,
      reply_to_user_id: reply_to_user_id || null
    });

    res.json({
      code: 0,
      data: { id: commentId },
      message: '评论成功'
    });
  }),

  /**
   * DELETE /community/comments/:id - 删除评论
   */
  deleteComment: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { id } = req.params;
    const result = await commentRepository.deleteComment(id, userId);

    if (!result) {
      return res.status(403).json({ code: 403, message: '无权删除此评论' });
    }

    res.json({ code: 0, message: '删除成功' });
  })
};