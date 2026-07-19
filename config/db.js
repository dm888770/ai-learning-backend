/**
 * MySQL 连接池
 * 使用 mysql2/promise 异步驱动
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'tokaido.proxy.rlwy.net',
  user: 'root',
  password: 'xvdjAGzlQzDOZRwUHvmoLCffHtwGZsLL',
  database: 'railway',
  port: 25336,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

console.log('📦 MySQL 连接池已创建 (tokaido.proxy.rlwy.net:25336/railway)');

module.exports = pool;
