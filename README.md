# AI 聊天助手

这是一个简单的AI聊天界面，可以轻松地部署到浏览器中，并与您提供的API进行交互。

## 功能特点

- 美观的聊天界面设计
- 响应式布局，适配各种屏幕尺寸
- 支持多行消息
- 键盘快捷键（Enter发送消息）
- 输入指示器动画
- 简单易用的代码结构

## 使用说明

### 配置API

在开始使用前，您需要在`app.js`文件中配置您的API端点：

```javascript
// API配置 - 请替换为你的API端点
const API_ENDPOINT = 'https://your-api-endpoint.com/chat';  // 替换为您提供的API地址
const API_KEY = '';  // 如果需要API密钥，请填写
```

### 本地测试

您可以使用任何静态文件服务器在本地测试此应用。以下是一些简单的方法：

#### 使用Python (Python 3+)

```bash
python -m http.server 8000
```

然后在浏览器中访问 `http://localhost:8000`

#### 使用Node.js

首先安装`http-server`：

```bash
npm install -g http-server
```

然后运行：

```bash
http-server
```

然后在浏览器中访问显示的URL（通常是 `http://localhost:8080`）

### 部署到生产环境

由于这是一个纯静态网站，您可以将其部署到任何支持静态网站托管的服务上：

1. **GitHub Pages**：将代码推送到GitHub仓库，然后启用GitHub Pages。
2. **Netlify**：连接您的GitHub仓库或直接上传这些文件。
3. **Vercel**：类似于Netlify，支持直接部署静态网站。
4. **AWS S3**：上传文件到S3存储桶，并配置为静态网站托管。
5. **任何Web服务器**：如Nginx、Apache等。

## API响应格式要求

默认情况下，应用期望API返回以下格式的JSON：

```json
{
  "response": "AI的回复内容"
}
```

如果您的API返回的格式不同，您可以在`app.js`文件中的以下行修改解析逻辑：

```javascript
// 根据API的响应格式调整这里
return data.response || data.message || data.answer || data.text || JSON.stringify(data);
```

## 自定义外观

您可以通过修改`styles.css`文件来自定义聊天界面的外观。主要的颜色变量包括：

- 主题色（蓝色）：`#4285f4`
- 背景色：`#f5f5f5`
- AI消息背景：`#f1f1f1`
- 用户消息背景：`#4285f4`

## 许可

本项目可自由使用。 