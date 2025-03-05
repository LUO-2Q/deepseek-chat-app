/**
 * 火山引擎API代理服务器
 * 
 * 这个Express服务器作为前端和火山引擎API之间的代理，
 * 用于解决CORS问题并保护API密钥不被暴露到前端。
 * 根据火山引擎官方文档调整了请求格式。
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件设置
app.use(cors());
app.use(express.json());

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 静态文件服务 - 确保所有静态资源都能被正确加载
app.use(express.static(path.join(__dirname)));

// 火山引擎API配置
const VOLCANO_API_KEY = process.env.VOLCANO_API_KEY;
const VOLCANO_API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions';

// 正确的模型ID格式
const DEFAULT_MODEL_ID = "bot-20250305151020-74fmc";  // 使用用户提供的正确模型ID

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    apiKeyConfigured: !!VOLCANO_API_KEY,
    defaultModelId: DEFAULT_MODEL_ID
  });
});

// API模型测试端点
app.get('/api/test-connection', async (req, res) => {
  try {
    if (!VOLCANO_API_KEY) {
      return res.status(500).json({ error: 'API密钥未配置' });
    }
    
    // 根据火山引擎文档调整请求格式
    const testRequest = {
      model: DEFAULT_MODEL_ID,
      stream: false,
      messages: [
        {
          "role": "system",
          "content": "You are a helpful assistant."
        },
        {
          "role": "user",
          "content": "Hello"
        }
      ]
    };
    
    console.log('测试API连接，使用模型:', DEFAULT_MODEL_ID);
    
    const response = await axios.post(VOLCANO_API_ENDPOINT, testRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCANO_API_KEY}`
      }
    });
    
    return res.json({
      status: 'success',
      message: '成功连接到火山引擎API',
      model: DEFAULT_MODEL_ID,
      response: response.data
    });
  } catch (error) {
    console.error('API连接测试失败:', error.message);
    
    let errorResponse = {
      status: 'error',
      message: '无法连接到火山引擎API'
    };
    
    if (error.response) {
      errorResponse.statusCode = error.response.status;
      errorResponse.error = error.response.data;
    } else {
      errorResponse.error = error.message;
    }
    
    return res.status(500).json(errorResponse);
  }
});

// 常规API代理路由
app.post('/api/chat', async (req, res) => {
  try {
    if (!VOLCANO_API_KEY) {
      console.error('API请求失败: API密钥未配置');
      return res.status(500).json({ error: 'API密钥未配置' });
    }

    // 构建请求数据，根据火山引擎格式要求调整
    const requestData = { ...req.body };
    
    // 如果客户端没有提供model，使用正确的默认值
    if (!requestData.model) {
      // 注意：字段名为"model"而不是"model_id"
      requestData.model = DEFAULT_MODEL_ID;
      console.log(`请求中未指定model，使用默认值: ${DEFAULT_MODEL_ID}`);
    }

    console.log(`发送API请求到火山引擎，使用模型: ${requestData.model}`);
    console.log('消息数量:', requestData.messages ? requestData.messages.length : 0);
    if (requestData.messages && requestData.messages.length > 0) {
      console.log('第一条消息内容示例:', requestData.messages[0].content.substring(0, 30) + '...');
    }
    
    const response = await axios.post(VOLCANO_API_ENDPOINT, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCANO_API_KEY}`
      }
    });

    console.log('API请求成功，状态码:', response.status);
    return res.json(response.data);
  } catch (error) {
    console.error('API代理错误:', error.message);
    
    // 提供详细的错误信息
    if (error.response) {
      console.error(`API错误 ${error.response.status}:`, JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status).json({
        error: `API错误: ${error.response.status}`,
        message: error.response.data
      });
    } else if (error.request) {
      console.error('没有收到API响应:', error.request);
      return res.status(504).json({
        error: '网关超时',
        message: '火山引擎API没有响应'
      });
    } else {
      console.error('请求配置错误:', error.message);
      return res.status(500).json({
        error: '服务器错误',
        message: error.message
      });
    }
  }
});

// 流式API代理路由
app.post('/api/chat/stream', async (req, res) => {
  try {
    if (!VOLCANO_API_KEY) {
      console.error('流式API请求失败: API密钥未配置');
      return res.status(500).json({ error: 'API密钥未配置' });
    }

    // 设置响应头，支持SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 构建请求数据，确保正确设置stream和model
    const requestData = { ...req.body, stream: true };
    
    // 如果客户端没有提供model，添加默认值
    if (!requestData.model) {
      requestData.model = DEFAULT_MODEL_ID;
      console.log(`流式请求中未指定model，使用默认值: ${DEFAULT_MODEL_ID}`);
    }
    
    // 确保stream_options是正确的格式
    if (!requestData.stream_options) {
      requestData.stream_options = { "include_usage": true };
    }

    console.log(`发送流式API请求到火山引擎，使用模型: ${requestData.model}`);
    console.log('消息数量:', requestData.messages ? requestData.messages.length : 0);
    
    // 创建axios请求
    const axiosResponse = await axios.post(VOLCANO_API_ENDPOINT, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCANO_API_KEY}`
      },
      responseType: 'stream'
    });

    // 将流式数据直接转发给客户端
    axiosResponse.data.pipe(res);

    // 处理关闭连接
    req.on('close', () => {
      if (axiosResponse.data) {
        axiosResponse.data.destroy();
        console.log('客户端关闭了连接，销毁流');
      }
      res.end();
    });
  } catch (error) {
    console.error('流式API代理错误:', error.message);
    
    // 返回错误事件
    let errorMessage = '未知错误';
    let errorDetails = {};
    
    if (error.response) {
      errorMessage = `API错误: ${error.response.status}`;
      try {
        // 尝试获取响应数据作为字符串
        const chunks = [];
        error.response.data.on('data', chunk => chunks.push(chunk));
        error.response.data.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8');
            errorDetails = JSON.parse(body);
          } catch (e) {
            errorDetails = { rawError: body };
          }
        });
      } catch (e) {
        errorDetails = { message: '无法解析错误响应' };
      }
    } else {
      errorMessage = error.message;
    }
    
    res.write(`data: ${JSON.stringify({
      error: true,
      message: errorMessage,
      details: errorDetails
    })}\n\n`);
    
    res.end();
  }
});

// 提供主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 明确处理CSS和JS文件（以防其他路由规则干扰）
app.get('/styles.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/app.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'app.js'));
});

// 通配符路由 - 处理所有其他请求
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
======================================
  火山引擎API聊天应用服务器
======================================
  服务器运行在: http://localhost:${PORT}
  API密钥状态: ${VOLCANO_API_KEY ? '已配置' : '未配置 ⚠️'}
  默认模型ID: ${DEFAULT_MODEL_ID}
  环境: ${process.env.NODE_ENV || '开发环境'}
  静态文件目录: ${__dirname}
======================================
  `);
});
