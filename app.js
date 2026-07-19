/**
 * AI 智能学习推荐平台 - Express 入口
 * 统一前缀: /api
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

const app = express();

// 全局中间件
app.use(cors());
app.use(express.json());
app.use(logger);

// API 路由
const routes = require('./routes');
app.use('/api', routes);

// 根路径
app.get('/', (req, res) => {
  res.json({ code: 200, msg: 'AI Learning Backend API', version: '1.0.0' });
});

// 404 兜底
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
    console.log(`📡 API 路由前缀: http://localhost:${PORT}/api`);
    console.log(`❤️  健康检查: http://localhost:${PORT}/api/test`);
  });
}

module.exports = app;