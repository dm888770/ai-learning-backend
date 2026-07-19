/**
 * 统一响应格式工具
 * 所有接口返回: { code, msg, data }
 */

/**
 * 成功响应
 * @param {object} res Express response
 * @param {*} data 业务数据
 * @param {string} msg 提示信息
 */
function success(res, data = null, msg = '操作成功') {
  return res.json({ code: 200, msg, data });
}

/**
 * 失败响应（业务错误，HTTP 状态码仍为 200，前端靠 code 区分）
 * @param {object} res
 * @param {number} code 业务错误码
 * @param {string} msg
 */
function fail(res, code = 400, msg = '操作失败') {
  return res.json({ code, msg, data: null });
}

/**
 * 服务端错误
 * @param {object} res
 * @param {string} msg
 */
function error(res, msg = '服务器内部错误') {
  return res.status(500).json({ code: 500, msg, data: null });
}

/**
 * 分页响应
 */
function page(res, list = [], total = 0, msg = '操作成功') {
  return res.json({ code: 200, msg, data: { list, total } });
}

module.exports = { success, fail, error, page };
