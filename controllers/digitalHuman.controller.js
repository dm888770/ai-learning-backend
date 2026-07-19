// controllers/digitalHuman.controller.js
// 讯飞数字人视频生成模块
const crypto = require('crypto');
const https = require('https');
const { success, fail } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

// 讯飞API配置
const XUNFEI_CONFIG = {
  APP_ID: process.env.XUNFEI_APP_ID || 'e5a7b5d3',
  API_SECRET: process.env.XUNFEI_API_SECRET || 'NTdhOTc4OTgxNjRkZDM2ZWMyMTYwNGFh',
  API_KEY: process.env.XUNFEI_API_KEY || '4dca4f8307428f2081e9614a3046fd41',
  HOST: 'vms.cn-huadong-1.xf-yun.com',
  PATH_GENERATE: '/v1/private/video/generate',
  PATH_QUERY: '/v1/private/video/query'
};

// 生成 RFC1123 格式的时间戳
function getRFC1123Date() {
  return new Date().toUTCString();
}

// 生成签名
function generateSignature(host, date, method, path, secret) {
  const signatureOrigin = `host: ${host}\ndate: ${date}\n${method} ${path} HTTP/1.1`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signatureOrigin);
  const signature = hmac.digest('base64');
  const authorizationOrigin = `api_key="${XUNFEI_CONFIG.API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  return Buffer.from(authorizationOrigin).toString('base64');
}

// 发送HTTPS请求
function httpsRequest(method, host, path, body, headers) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

module.exports = {
  // POST /digital-human/generate - 创建视频生成任务
  generateVideo: asyncHandler(async (req, res) => {
    const { script, callback_url } = req.body;

    if (!script) {
      throw { statusCode: 400, message: '视频脚本不能为空' };
    }

    const date = getRFC1123Date();
    const signature = generateSignature(XUNFEI_CONFIG.HOST, date, 'POST', XUNFEI_CONFIG.PATH_GENERATE, XUNFEI_CONFIG.API_SECRET);

    const queryParams = new URLSearchParams({
      authorization: signature,
      date: date,
      host: XUNFEI_CONFIG.HOST
    });

    const requestBody = {
      header: {
        app_id: XUNFEI_CONFIG.APP_ID,
        callback_url: callback_url || ''
      },
      parameter: {
        avatar: {
          prompt: script,
          word_count: 150
        }
      }
    };

    console.log('🎬 创建讯飞数字人视频任务...');
    console.log('脚本:', script.substring(0, 50) + '...');

    try {
      const result = await httpsRequest(
        'POST',
        XUNFEI_CONFIG.HOST,
        XUNFEI_CONFIG.PATH_GENERATE + '?' + queryParams.toString(),
        requestBody
      );

      console.log('讯飞响应状态:', result.status);
      console.log('讯飞响应数据:', JSON.stringify(result.data).substring(0, 200));

      if (result.status === 200 && result.data.header && result.data.header.code === 0) {
        const taskId = result.data.header.task_id;
        return success(res, {
          taskId: taskId,
          videoUrl: null,
          fallback: false,
          message: '视频生成任务已创建，请使用task_id查询状态'
        });
      } else {
        // 接口调用失败，降级到TTS
        console.warn('讯飞接口调用失败，降级到TTS模式');
        return success(res, {
          videoUrl: null,
          fallback: true,
          script: script,
          message: '数字人服务暂时不可用，已切换为AI语音播报模式'
        });
      }
    } catch (error) {
      console.error('讯飞接口异常:', error.message);
      // 降级到TTS
      return success(res, {
        videoUrl: null,
        fallback: true,
        script: script,
        message: '数字人服务暂时不可用，已切换为AI语音播报模式'
      });
    }
  }),

  // POST /digital-human/query - 查询视频状态
  queryVideo: asyncHandler(async (req, res) => {
    const { task_id } = req.body;

    if (!task_id) {
      throw { statusCode: 400, message: 'task_id不能为空' };
    }

    const date = getRFC1123Date();
    const signature = generateSignature(XUNFEI_CONFIG.HOST, date, 'POST', XUNFEI_CONFIG.PATH_QUERY, XUNFEI_CONFIG.API_SECRET);

    const queryParams = new URLSearchParams({
      authorization: signature,
      date: date,
      host: XUNFEI_CONFIG.HOST
    });

    const requestBody = {
      header: {
        app_id: XUNFEI_CONFIG.APP_ID,
        task_id: task_id
      }
    };

    console.log('🔍 查询讯飞视频状态, task_id:', task_id);

    try {
      const result = await httpsRequest(
        'POST',
        XUNFEI_CONFIG.HOST,
        XUNFEI_CONFIG.PATH_QUERY + '?' + queryParams.toString(),
        requestBody
      );

      if (result.status === 200 && result.data.header && result.data.header.code === 0) {
        const taskStatus = result.data.header.task_status;
        const payload = result.data.payload || {};

        return success(res, {
          taskId: task_id,
          status: taskStatus,
          videoUrl: payload.video || null,
          audioUrl: payload.audio || null,
          text: payload.text || null,
          message: taskStatus === '4' ? '视频生成完成' : '视频生成中'
        });
      } else {
        throw { statusCode: 500, message: '查询失败' };
      }
    } catch (error) {
      console.error('查询异常:', error.message);
      throw { statusCode: 500, message: '查询失败: ' + error.message };
    }
  })
};
