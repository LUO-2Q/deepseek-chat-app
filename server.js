/**
 * 火山引擎API代理服务器
 * 
 * 这个简单的Express服务器作为前端和火山引擎API之间的代理，
 * 用于解决CORS问题并保护API密钥不被暴露到前端。
 * 
 * 使用方法：
 * 1. 安装依赖: npm install express cors axios dotenv
 * 2. 创建.env文件，添加 VOLCANO_API_KEY=您的API密钥
 * 3. 运行: node server.js
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
app.use(express.static(path.join(__dirname, './'))); // 提供静态文件

// 火山引擎API配置
const VOLCANO_API_KEY = process.env.VOLCANO_API_KEY;
const VOLCANO_API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions';

// 常规API代理路由
app.post('/api/chat', async (req, res) => {
  try {
    if (!VOLCANO_API_KEY) {
      return res.status(500).json({ error: 'API密钥未配置' });
    }

    const response = await axios.post(VOLCANO_API_ENDPOINT, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCANO_API_KEY}`
      }
    });

    return res.json(response.data);
  } catch (error) {
    console.error('API代理错误:', error.message);
    
    // 提供友好的错误信息
    if (error.response) {
      // 服务器响应了，但状态码不是2xx
      return res.status(error.response.status).json({
        error: `API错误: ${error.response.status}`,
        message: error.response.data
      });
    } else if (error.request) {
      // 请求已发送但没有收到响应
      return res.status(504).json({
        error: '网关超时',
        message: '火山引擎API没有响应'
      });
    } else {
      // 请求设置时发生错误
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
      return res.status(500).json({ error: 'API密钥未配置' });
    }

    // 设置响应头，支持SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 确保请求体中的stream设置为true
    const requestData = { ...req.body, stream: true };

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
      }
      res.end();
    });
  } catch (error) {
    console.error('流式API代理错误:', error.message);
    
    // 返回错误事件
    res.write(`data: ${JSON.stringify({
      error: true,
      message: error.message
    })}\n\n`);
    
    res.end();
  }
});

// 提供主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`API代理服务器运行在 http://localhost:${PORT}`);
  console.log(`API密钥状态: ${VOLCANO_API_KEY ? '已配置' : '未配置'}`);
}); 