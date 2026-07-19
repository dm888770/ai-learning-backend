const userService = require('../services/user.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 认证相关 Controller
 */
module.exports = {
  /** POST /auth/register */
  register: asyncHandler(async (req, res) => {
    const data = await userService.register(req.body || {});
    return success(res, data, '注册成功');
  }),

  /** POST /auth/login */
  login: asyncHandler(async (req, res) => {
    const data = await userService.login(req.body || {});
    return success(res, data, '登录成功');
  }),

  /** GET /auth/user */
  getUserInfo: asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.query.user_id;
    if (!userId) return success(res, null);
    const data = await userService.getUserInfo(userId);
    return success(res, data);
  })
};
