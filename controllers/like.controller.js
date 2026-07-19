// controllers/like.controller.js
const likeRepository = require('../repositories/like.repository');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

function getUserId(req) {
  return req.user?.id || req.body?.user_id || req.query?.user_id;
}

module.exports = {
  /**
   * POST /community/like/toggle - 切换点赞状态
   */
  toggleLike: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const { target_type, target_id } = req.body;

    if (!target_type || !target_id) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' });
    }

    if (!['post', 'comment'].includes(target_type)) {
      return res.status(400).json({ code: 400, message: '不支持的点赞类型' });
    }

    const result = await likeRepository.toggleLike(userId, target_type, target_id);

    res.json({
      code: 0,
      data: result,
      message: result.liked ? '点赞成功' : '取消点赞'
    });
  }),

  /**
   * GET /community/like/status - 获取点赞状态
   */
  getLikeStatus: asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.json({ code: 0, data: { liked: false } });
    }

    const { target_type, target_id } = req.query;

    if (!target_type || !target_id) {
      return res.json({ code: 0, data: { liked: false } });
    }

    const liked = await likeRepository.checkLiked(userId, target_type, target_id);

    res.json({ code: 0, data: { liked } });
  })
};