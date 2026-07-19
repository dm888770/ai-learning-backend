/**
 * MySQL 连接池
 * 使用 mysql2/promise 异步驱动
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'tokaido.proxy.rlwy.net',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'xvdjAGzlQzDOZRwUHvmoLCffHtwGZsLL',
  database: process.env.DB_NAME || 'railway',
  port: process.env.DB_PORT || 25336,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

console.log(`📦 MySQL 连接池已创建 (${process.env.DB_HOST || 'tokaido.proxy.rlwy.net'}:${process.env.DB_PORT || 25336}/${process.env.DB_NAME || 'railway'})`);

module.exports = pool;
