const { fail } = require('../utils/response');

/**
 * 简单的 token 验证中间件
 * token 格式: base64(userId:timestamp)
 * 挂载到 req.user = { id }
 *
 * 用法: router.get('/xxx', auth, controller.xxx)
 */
function auth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    return fail(res, 401, '未登录');
  }
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, ts] = decoded.split(':');
    if (!userId || isNaN(Number(userId))) {
      return fail(res, 401, 'token 无效');
    }
    // 30天过期
    const age = Date.now() - Number(ts);
    if (age > 30 * 24 * 60 * 60 * 1000) {
      return fail(res, 401, 'token 已过期');
    }
    req.user = { id: Number(userId) };
    next();
  } catch (e) {
    return fail(res, 401, 'token 解析失败');
  }
}

/**
 * 软认证：如果有 token 就解析，没有也放行（用于兼容原代码 user_id 可从 query/body 传入）
 */
function softAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    // 兼容原逻辑：允许从 body/query 拿 user_id
    const userId = req.body?.user_id || req.query?.user_id;
    if (userId) req.user = { id: Number(userId) };
    return next();
  }
  return auth(req, res, next);
}

module.exports = { auth, softAuth };
