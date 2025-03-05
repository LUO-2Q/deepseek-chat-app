/**
 * 火山引擎API代理服务器
 * 
 * 这个Express服务器作为前端和火山引擎API之间的代理，
 * 用于解决CORS问题并保护API密钥不被暴露到前端。
 * 同时提供静态文件服务，让整个应用可以部署在同一个服务上。
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

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    apiKeyConfigured: !!VOLCANO_API_KEY
  });
});

// 常规API代理路由
app.post('/api/chat', async (req, res) => {
  try {
    if (!VOLCANO_API_KEY) {
      console.error('API请求失败: API密钥未配置');
      return res.status(500).json({ error: 'API密钥未配置' });
    }

    console.log('发送API请求到火山引擎...');
    const response = await axios.post(VOLCANO_API_ENDPOINT, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCANO_API_KEY}`
      }
    });

    console.log('API请求成功，返回结果');
    return res.json(response.data);
  } catch (error) {
    console.error('API代理错误:', error.message);
    
    // 提供友好的错误信息
    if (error.response) {
      // 服务器响应了，但状态码不是2xx
      console.error(`API错误 ${error.response.status}:`, error.response.data);
      return res.status(error.response.status).json({
        error: `API错误: ${error.response.status}`,
        message: error.response.data
      });
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('没有收到API响应:', error.request);
      return res.status(504).json({
        error: '网关超时',
        message: '火山引擎API没有响应'
      });
    } else {
      // 请求设置时发生错误
      console.error('请求配置错误:', error);
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

    // 确保请求体中的stream设置为true
    const requestData = { ...req.body, stream: true };

    console.log('发送流式API请求到火山引擎...');
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
    res.write(`data: ${JSON.stringify({
      error: true,
      message: error.message
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
  res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/app.js', (req, res) => {
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
  DeepSeek AI 聊天应用服务器
======================================
  服务器运行在: http://localhost:${PORT}
  API密钥状态: ${VOLCANO_API_KEY ? '已配置' : '未配置 ⚠️'}
  环境: ${process.env.NODE_ENV || '开发环境'}
  静态文件目录: ${__dirname}
======================================
  `);
});
