# DeepSeek AI 聊天应用部署指南

本文档提供了将DeepSeek AI聊天应用部署到生产环境的详细步骤。

## 前提条件

- Node.js 14.0.0或更高版本
- npm或yarn包管理器
- 火山引擎API密钥
- 域名（可选，但推荐）
- SSL证书（可选，但强烈推荐）

## 部署选项

### 1. 自托管服务器部署

#### 安装依赖
```bash
# 克隆代码库（假设您已将代码推送到GitHub）
git clone https://github.com/yourusername/deepseek-chat-app.git
cd deepseek-chat-app

# 安装依赖
npm install
```

#### 配置环境变量
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑.env文件，设置您的API密钥
nano .env
```

#### 启动服务器
```bash
# 生产环境启动
npm start

# 或使用PM2进行进程管理（推荐）
npm install -g pm2
pm2 start server.js --name deepseek-chat
```

#### 配置反向代理（推荐）

使用Nginx配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向HTTP到HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;

    # 代理到Node.js应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. 使用Vercel部署（简易方案）

1. 在项目根目录创建`vercel.json`文件：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

2. 安装Vercel CLI并部署：

```bash
npm install -g vercel
vercel login
vercel
```

3. 在Vercel仪表板中添加环境变量`VOLCANO_API_KEY`。

### 3. 使用Heroku部署

1. 安装Heroku CLI：
```bash
npm install -g heroku
heroku login
```

2. 创建Heroku应用并部署：
```bash
heroku create deepseek-chat-app
git push heroku main
```

3. 设置环境变量：
```bash
heroku config:set VOLCANO_API_KEY=your-api-key
```

## 前端配置

部署到生产环境时，请确保在`app.js`中修改以下设置：

```javascript
const ENV = 'production'; // 将环境变量改为'production'
```

这将使应用使用后端代理而非直接调用API，从而避免CORS问题并保护API密钥。

## 安全注意事项

1. **永远不要**在前端代码中暴露真实的API密钥
2. 使用HTTPS加密所有通信
3. 定期更新依赖包以修复安全漏洞
4. 考虑添加速率限制以防止API滥用

## 性能优化

1. 启用静态资源缓存
2. 考虑使用CDN加速静态资源加载
3. 实现请求合并和压缩
4. 对大型应用考虑使用负载均衡

## 故障排除

如果遇到问题，请检查：

1. 服务器日志 `npm start` 或 `heroku logs --tail`
2. 确保API密钥有效且未过期
3. 检查防火墙设置是否允许相关端口通信
4. 验证环境变量是否正确设置 