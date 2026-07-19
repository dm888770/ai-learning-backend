const { fail } = require('../utils/response');

/**
 * 全局错误处理中间件
 * 捕获 controller/async 函数中的未捕获异常
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('💥 未捕获错误:', err.stack || err.message);
  // 数据库错误
  if (err.code && typeof err.code === 'string' && err.code.startsWith('ER_')) {
    return fail(res, 500, `数据库错误: ${err.code}`);
  }
  // 业务异常（有 statusCode 字段）
  if (err.statusCode) {
    return fail(res, err.statusCode, err.message);
  }
  return fail(res, 500, err.message || '服务器内部错误');
}

/**
 * 异步控制器包装器，自动捕获异常传递给 errorHandler
 * @param {function} fn async controller
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 兜底
 */
function notFoundHandler(req, res) {
  console.log('404 Not Found:', req.originalUrl);
  return fail(res, 404, `接口不存在: ${req.method} ${req.originalUrl}`);
}

module.exports = { errorHandler, asyncHandler, notFoundHandler };
