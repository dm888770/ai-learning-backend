/**
 * 简单日志中间件
 * 打印请求方法、URL、响应状态码、耗时
 */
function logger(req, res, next) {
  const start = Date.now();
  
  // 请求结束时打印日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method.padEnd(6);
    const url = req.originalUrl;
    const status = res.statusCode;
    const statusColor = status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${statusColor}${status}\x1b[0m ${method} ${url} - ${duration}ms`);
  });
  
  next();
}

module.exports = logger;
