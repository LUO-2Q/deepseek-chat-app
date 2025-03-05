// DOM元素
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const uploadButton = document.getElementById('upload-button');
const fileInput = document.getElementById('file-input');
const filePreviewContainer = document.getElementById('file-preview-container');
const emptyState = document.getElementById('empty-state');
const newChatBtns = document.querySelectorAll('.new-chat-btn');
const modelBtn = document.querySelector('.model-btn');
const webSearchBtn = document.querySelector('.web-search-btn');
const chatHistory = document.querySelector('.chat-history');
const currentChatTitle = document.querySelector('.current-chat-title');
const themeSwitch = document.getElementById('theme-switch');

// 应用状态
let chats = [];
let activeChat = null;
let isWebSearchEnabled = false;
let currentChatId = generateId();
let conversations = {};
let useWebSearch = false;
let messagesQueue = [];
let isProcessing = false;
let selectedFiles = []; // 存储选择的文件

// 初始化默认聊天
const defaultChat = {
    id: 'new-chat-' + Date.now(),
    title: '新对话',
    messages: [],
    createdAt: new Date()
};

// API配置 - 火山引擎API
const ENV = 'development'; // 可改为'production'以使用真实API
const USE_CORS_PROXY = ENV === 'development';  // 开发环境使用CORS代理

// 代理和端点配置
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';  // 使用更可靠的CORS代理服务
const RAW_API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions';  // 原始火山引擎API地址
const PROXY_API_ENDPOINT = '/api/chat'; // 生产环境中使用的后端代理API地址

// 根据环境选择合适的API端点
const API_ENDPOINT = ENV === 'development' 
  ? (USE_CORS_PROXY ? CORS_PROXY + encodeURIComponent(RAW_API_ENDPOINT) : RAW_API_ENDPOINT)
  : PROXY_API_ENDPOINT;

const API_KEY = 'b6f76dc9-69b9-48cb-b97b-5f4280ec37e9';  // 火山引擎API Key
const MODEL_ID = 'bot-202503051510207-74fmc';  // 火山引擎模型ID

// 设置调试模式
const DEBUG = true; // 调试模式，会在控制台输出更多信息

// 设置全局直接发送消息函数，用于HTML直接调用
window.sendMessageDirectly = function() {
    console.log('直接发送消息函数被调用');
    
    // 确保聊天界面已初始化
    initChatUI();
    
    // 确保activeChat已初始化
    if (!activeChat) {
        console.log('activeChat未初始化，创建新的聊天');
        activeChat = {
            id: generateId(),
            title: '新对话',
            messages: [],
            createdAt: new Date()
        };
        
        // 将新创建的聊天添加到chats数组
        chats.push(activeChat);
    }
    
    // 调用主发送消息函数
    sendMessage();
};

// 简化的添加消息函数
function addMessageSimple(sender, content) {
    console.log('添加消息:', sender, content);
    
    const messagesContainer = document.getElementById('chat-messages');
    console.log('消息容器:', messagesContainer);
    
    if (!messagesContainer) {
        console.error('未找到聊天消息容器');
        return;
    }
    
    // 确保聊天消息区域可见
    messagesContainer.style.display = 'flex';
    messagesContainer.style.flexDirection = 'column';
    
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.style.width = '100%';
    messageDiv.style.margin = '8px 0';
    messageDiv.style.display = 'flex';
    
    // 创建消息内容
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.style.padding = '12px 16px';
    contentDiv.style.borderRadius = '8px';
    contentDiv.style.maxWidth = '80%';
    
    if (sender === 'user') {
        contentDiv.style.backgroundColor = '#4285f4';
        contentDiv.style.color = 'white';
        contentDiv.style.marginLeft = 'auto';
    } else {
        contentDiv.style.backgroundColor = '#f1f1f1';
        contentDiv.style.color = '#333';
    }
    
    contentDiv.innerHTML = formatMessageSimple(content);
    
    // 添加到消息元素
    messageDiv.appendChild(contentDiv);
    
    // 添加到消息容器
    messagesContainer.appendChild(messageDiv);
    console.log('消息已添加到DOM');
    
    // 隐藏空状态
    hideEmptyStateSimple();
    
    // 滚动到底部
    scrollToBottomSimple();
}

// 简化的格式化消息函数
function formatMessageSimple(content) {
    // 转义HTML
    content = content.replace(/&/g, '&amp;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;')
                     .replace(/"/g, '&quot;')
                     .replace(/'/g, '&#039;');
    
    // 将换行符转换为<br>
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

// 简化的隐藏空状态函数
function hideEmptyStateSimple() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.style.display = 'none';
    }
}

// 简化的滚动到底部函数
function scrollToBottomSimple() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 设置API密钥
function setupApiSettings() {
    const apiSettingsBtn = document.getElementById('api-settings-btn');
    const apiSettingsModal = document.getElementById('api-settings-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiSettingsBtn = document.getElementById('save-api-settings');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    
    // 从本地存储加载API密钥
    const savedApiKey = localStorage.getItem('arkApiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        API_KEY = savedApiKey;
    }
    
    // 打开设置对话框
    apiSettingsBtn.addEventListener('click', () => {
        apiSettingsModal.style.display = 'block';
    });
    
    // 关闭设置对话框
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            apiSettingsModal.style.display = 'none';
        });
    });
    
    // 点击对话框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === apiSettingsModal) {
            apiSettingsModal.style.display = 'none';
        }
    });
    
    // 保存API设置
    saveApiSettingsBtn.addEventListener('click', () => {
        const newApiKey = apiKeyInput.value.trim();
        
        // 保存到本地存储
        localStorage.setItem('arkApiKey', newApiKey);
        
        // 更新当前会话中的API密钥
        API_KEY = newApiKey;
        
        // 关闭对话框
        apiSettingsModal.style.display = 'none';
        
        // 显示成功消息
        alert('API设置已保存');
    });
}

// 初始化函数
function init() {
    // 加载聊天记录
    loadChats();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 设置主题切换
    setupThemeToggle();
    
    // 设置背景效果
    setupBackgroundEffects();
    
    // 设置文件上传处理
    setupFileUploadHandlers();
    
    // 设置API设置
    setupApiSettings();
    
    // 初始化聊天UI
    initChatUI();
    
    // 更新侧边栏
    updateSidebar();
    
    // 更新聊天视图
    updateChatView();
}

// 加载聊天记录
function loadChats() {
    const savedChats = localStorage.getItem('deepseek-chats');
    if (savedChats) {
        try {
            chats = JSON.parse(savedChats);
            // 转换日期字符串回日期对象
            chats.forEach(chat => {
                chat.createdAt = new Date(chat.createdAt);
            });
        } catch (e) {
            console.error('加载聊天记录失败', e);
            chats = [];
        }
    } else {
        chats = [];
    }
}

// 保存聊天记录
function saveChats() {
    try {
        localStorage.setItem('deepseek-chats', JSON.stringify(chats));
    } catch (e) {
        console.error('保存聊天记录失败', e);
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 发送消息事件
    console.log('Setting up send button event listener');
    sendButton.addEventListener('click', function() {
        console.log('Send button clicked');
        handleSendMessage();
    });
    userInput.addEventListener('keydown', handleInputKeydown);
    
    // 联网搜索按钮
    webSearchBtn.addEventListener('click', function() {
        console.log('Web search button clicked');
        toggleWebSearch();
    });
    
    // 输入框自动调整高度
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight < 200) ? `${userInput.scrollHeight}px` : '200px';
    });
    
    // 新对话按钮 - 使用事件委托确保动态添加的元素也能工作
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.new-chat-btn');
        if (target) {
            startNewChat();
        }
    });
    
    // 上传按钮
    uploadButton.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 历史项的点击事件 - 使用事件委托
    chatHistory.addEventListener('click', (e) => {
        // 检查是否点击了历史项
        const historyItem = e.target.closest('.history-item:not(.active)');
        if (historyItem && historyItem.dataset.chatId) {
            switchChat(historyItem.dataset.chatId);
        }
        
        // 检查是否点击了选项按钮
        const optionsBtn = e.target.closest('.options-btn');
        if (optionsBtn) {
            e.stopPropagation(); // 防止触发历史项点击
            const chatId = optionsBtn.closest('.history-item').dataset.chatId;
            showChatOptions(chatId, optionsBtn);
        }
    });
}

// 显示聊天选项菜单
function showChatOptions(chatId, button) {
    // 移除任何现有的菜单
    const existingMenu = document.querySelector('.chat-options-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // 创建选项菜单
    const menu = document.createElement('div');
    menu.className = 'chat-options-menu';
    menu.innerHTML = `
        <button class="menu-item delete-chat" data-chat-id="${chatId}">
            <i class="fa-solid fa-trash"></i> 删除对话
        </button>
    `;
    
    // 定位菜单
    const rect = button.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    menu.style.backgroundColor = 'var(--bg-sidebar)';
    menu.style.border = '1px solid var(--border-color)';
    menu.style.borderRadius = '6px';
    menu.style.padding = '5px 0';
    menu.style.zIndex = '1000';
    menu.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.2)';
    
    // 添加菜单项样式
    const style = document.createElement('style');
    style.textContent = `
        .menu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: none;
            border: none;
            color: var(--text-primary);
            width: 100%;
            text-align: left;
            cursor: pointer;
            font-size: 14px;
        }
        .menu-item:hover {
            background-color: var(--hover-color);
        }
        .delete-chat {
            color: #ff4d4f;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(menu);
    
    // 添加删除点击事件
    menu.querySelector('.delete-chat').addEventListener('click', () => {
        deleteChat(chatId);
        menu.remove();
    });
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target) && !button.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

// 删除聊天
function deleteChat(chatId) {
    const index = chats.findIndex(chat => chat.id === chatId);
    if (index !== -1) {
        chats.splice(index, 1);
        
        // 如果删除了当前活动聊天，切换到最新的聊天
        if (activeChat.id === chatId) {
            if (chats.length > 0) {
                activeChat = chats[0];
            } else {
                // 如果没有聊天了，创建一个新的
                startNewChat();
                return;
            }
        }
        
        saveChats();
        updateSidebar();
        updateChatView();
    }
}

// 切换联网搜索
function toggleWebSearch() {
    isWebSearchEnabled = !isWebSearchEnabled;
    
    if (isWebSearchEnabled) {
        webSearchBtn.classList.add('active');
        // 使用变量颜色，适配深色和浅色模式
        webSearchBtn.style.backgroundColor = 'rgba(10, 132, 255, 0.15)'; 
        webSearchBtn.style.color = 'var(--primary-color)';
    } else {
        webSearchBtn.classList.remove('active');
        webSearchBtn.style.backgroundColor = '';
        webSearchBtn.style.color = '';
    }
}

// 开始新对话
function startNewChat() {
    currentChatId = generateId();
    conversations[currentChatId] = {
        title: '新对话',
        messages: [],
        timestamp: Date.now()
    };
    
    saveConversations();
    renderMessages([]);
    updateChatTitle();
    renderHistory();
    
    // 清空已选择的文件
    selectedFiles = [];
    renderFilePreview();
    
    // 焦点放在输入框
    userInput.focus();
    
    // 添加激活类，如果在移动视图中
    document.querySelector('.sidebar').classList.remove('active');
}

// 更新侧边栏
function updateSidebar() {
    // 清空历史记录
    chatHistory.innerHTML = '';
    
    // 按日期分组聊天记录
    const chatsByDate = groupChatsByDate();
    
    // 添加新的历史记录
    for (const [dateLabel, dateChats] of Object.entries(chatsByDate)) {
        // 添加日期标签
        const dateHeader = document.createElement('div');
        dateHeader.className = 'history-header';
        dateHeader.textContent = dateLabel;
        chatHistory.appendChild(dateHeader);
        
        // 添加该日期下的聊天记录
        dateChats.forEach(chat => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.chatId = chat.id;
            
            if (activeChat && chat.id === activeChat.id) {
                historyItem.classList.add('active');
            }
            
            historyItem.innerHTML = `
                <span>${chat.title}</span>
                <button class="options-btn"><i class="fa-solid fa-ellipsis"></i></button>
            `;
            
            chatHistory.appendChild(historyItem);
        });
    }
}

// 按日期分组聊天记录
function groupChatsByDate() {
    const groups = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 日期格式化函数
    const isSameDay = (date1, date2) => {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    };
    
    // 按日期分组
    chats.forEach(chat => {
        const chatDate = new Date(chat.createdAt);
        let dateLabel;
        
        if (isSameDay(chatDate, today)) {
            dateLabel = '今天';
        } else if (isSameDay(chatDate, yesterday)) {
            dateLabel = '昨天';
        } else {
            // 格式化为 "yyyy年MM月dd日"
            dateLabel = `${chatDate.getFullYear()}年${chatDate.getMonth() + 1}月${chatDate.getDate()}日`;
        }
        
        if (!groups[dateLabel]) {
            groups[dateLabel] = [];
        }
        
        groups[dateLabel].push(chat);
    });
    
    return groups;
}

// 切换到特定聊天
function switchChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        activeChat = chat;
        currentChatTitle.textContent = chat.title;
        updateChatView();
        updateSidebar(); // 更新侧边栏高亮显示当前聊天
    }
}

// 更新聊天视图
function updateChatView() {
    // 清空聊天区域
    chatMessages.innerHTML = '';
    
    // 如果有活动聊天且有消息，隐藏空状态并显示消息
    if (activeChat && activeChat.messages && activeChat.messages.length > 0) {
        hideEmptyState();
        
        // 添加消息到聊天区域
        activeChat.messages.forEach(msg => {
            addMessageToChat(msg.sender, msg.content, false);
        });
        
        // 滚动到底部
        scrollToBottom();
    } else {
        // 没有消息，显示空状态
        showEmptyState();
    }
}

// 显示空状态
function showEmptyState() {
    emptyState.style.display = 'flex';
}

// 隐藏空状态
function hideEmptyState() {
    emptyState.style.display = 'none';
}

// 发送消息函数
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // 确保activeChat已初始化
    if (!activeChat) {
        console.log('初始化activeChat');
        activeChat = {
            id: currentChatId,
            title: '新对话',
            messages: [],
            createdAt: new Date()
        };
        chats.unshift(activeChat);
    }
    
    // 清空输入框并重置高度
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // 隐藏空状态
    hideEmptyState();
    
    // 添加用户消息到聊天区域和数据
    addMessageToChat('user', message);
    activeChat.messages.push({
        sender: 'user',
        content: message,
        timestamp: Date.now()
    });
    
    // 如果这是聊天的第一条消息，更新标题
    if (activeChat.messages.length === 1) {
        // 使用消息的前20个字符作为标题
        activeChat.title = message.length > 20 ? message.substring(0, 20) + '...' : message;
        currentChatTitle.textContent = activeChat.title;
        updateSidebar();
    }
    
    // 保存聊天记录
    saveChats();
    
    // 显示"正在输入"指示器
    showTypingIndicator();
    
    try {
        if (DEBUG) console.log('发送消息:', message);
        
        // 创建一个空的AI消息元素，用于更新
        const aiMessageId = 'ai-message-' + Date.now();
        const aiMessageElement = document.createElement('div');
        aiMessageElement.className = 'message ai-message';
        aiMessageElement.innerHTML = `
            <div class="message-content" id="${aiMessageId}"></div>
        `;
        chatMessages.appendChild(aiMessageElement);
        
        // 移除"正在输入"指示器
        removeTypingIndicator();
        
        // 滚动到底部
        scrollToBottom();

        let response;
        
        // 尝试使用流式API调用
        try {
            if (DEBUG) console.log('尝试流式API调用');
            response = await callChatAPIStream(message, (partialResponse) => {
                // 更新消息内容
                const messageContentElement = document.getElementById(aiMessageId);
                if (messageContentElement) {
                    messageContentElement.innerHTML = formatMessageContent(partialResponse);
                    scrollToBottom();
                }
            });
        } catch (streamError) {
            // 如果流式调用失败，尝试普通调用
            console.error('流式API调用失败，尝试普通调用:', streamError);
            response = await callChatAPI(message);
            
            // 更新消息内容
            const messageContentElement = document.getElementById(aiMessageId);
            if (messageContentElement) {
                messageContentElement.innerHTML = formatMessageContent(response);
                scrollToBottom();
            }
        }
        
        // 添加AI回复到数据
        activeChat.messages.push({
            sender: 'ai',
            content: response,
            timestamp: Date.now()
        });
        
        // 保存聊天记录
        saveChats();
        
    } catch (error) {
        console.error('发送消息失败:', error);
        
        // 移除"正在输入"指示器
        removeTypingIndicator();
        
        // 显示错误信息
        addMessageToChat('ai', `抱歉，发生了错误: ${error.message}`);
        activeChat.messages.push({
            sender: 'ai',
            content: `抱歉，发生了错误: ${error.message}`,
            timestamp: Date.now()
        });
        
        // 保存聊天记录
        saveChats();
    }
}

// 添加消息到聊天区域
function addMessageToChat(sender, content, shouldAnimate = true) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');
    
    if (shouldAnimate) {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(10px)';
    }
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    // 使用段落元素来支持多行文本
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        const p = document.createElement('p');
        p.textContent = line;
        messageContent.appendChild(p);
        
        // 添加分割线，除了最后一行
        if (index < lines.length - 1 && line.trim() !== '') {
            const br = document.createElement('br');
            messageContent.appendChild(br);
        }
    });
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // 动画效果
    if (shouldAnimate) {
        setTimeout(() => {
            messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 10);
    }
    
    // 滚动到最新消息
    scrollToBottom();
}

// 显示"正在输入"指示器
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'ai-message', 'typing-indicator-container');
    
    const typingContent = document.createElement('div');
    typingContent.classList.add('message-content', 'typing-indicator');
    
    // 添加三个点来表示正在输入
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        typingContent.appendChild(dot);
    }
    
    typingDiv.appendChild(typingContent);
    typingDiv.id = 'typing-indicator';
    chatMessages.appendChild(typingDiv);
    
    // 滚动到最新消息
    scrollToBottom();
}

// 移除"正在输入"指示器
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// 滚动到最新消息
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 调用聊天API
async function callChatAPI(message) {
    try {
        if (DEBUG) console.log('调用普通API...');
        
        // 开发环境中使用模拟响应
        if (ENV === 'development' && USE_CORS_PROXY) {
            console.warn('开发环境使用模拟响应');
            return await mockApiCall(message);
        }
        
        // 生产环境或不使用CORS代理时，使用真实API调用
        // 检查API密钥是否设置
        if (!API_KEY && ENV !== 'development') {
            throw new Error('API密钥未设置，请在API设置中配置您的火山引擎API密钥');
        }
        
        // 构建API请求参数
        const requestData = {
            model: MODEL_ID,
            stream: false,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                {
                    role: "user",
                    content: message
                }
            ]
        };
        
        // 如果有聊天历史记录，添加到请求中
        if (activeChat && activeChat.messages.length > 0) {
            const messageHistory = [];
            
            // 添加前几条对话历史
            for (let i = 0; i < activeChat.messages.length - 1; i++) {
                const msg = activeChat.messages[i];
                messageHistory.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            }
            
            // 如果有历史消息，使用历史消息和当前消息
            if (messageHistory.length > 0) {
                requestData.messages = [
                    {
                        role: "system",
                        content: "You are a helpful assistant."
                    },
                    ...messageHistory,
                    {
                        role: "user",
                        content: message
                    }
                ];
            }
        }
        
        console.log('API请求数据:', requestData);
        console.log('API端点:', API_ENDPOINT);
        
        if (DEBUG) console.log('API密钥:', API_KEY ? `${API_KEY.substring(0, 5)}...` : '未设置');
        
        // 根据环境配置请求头
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 在直接调用时添加Authorization头，在使用后端代理时可能不需要
        if (ENV !== 'production') {
            headers['Authorization'] = `Bearer ${API_KEY}`;
        }
        
        // 尝试使用fetch API发送请求
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData),
            });
            
            if (DEBUG) console.log('API响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API错误响应:', errorText);
                throw new Error(`HTTP错误! 状态: ${response.status}, 响应: ${errorText}`);
            }
            
            const data = await response.json();
            if (DEBUG) console.log('API响应数据:', data);
            
            // 从火山引擎API响应中提取内容
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                return data.choices[0].message.content;
            }
            
            // 兼容处理，如果响应格式不一致
            return data.content || data.message || data.response || data.answer || 
                data.text || JSON.stringify(data);
        } catch (fetchError) {
            console.error('Fetch API错误:', fetchError);
            
            // 如果是在开发环境中遇到错误，尝试使用模拟响应
            if (ENV === 'development') {
                console.warn('API调用失败，回退到模拟响应');
                return await mockApiCall(message);
            }
            
            throw fetchError;
        }
    } catch (error) {
        console.error('API调用失败:', error);
        throw error;
    }
}

// 模拟API调用（开发测试用，可以在正式环境中移除）
async function mockApiCall(message) {
    return new Promise((resolve) => {
        // 模拟网络延迟
        setTimeout(() => {
            // 根据消息内容生成不同的回复
            if (message.includes('你好') || message.includes('嗨') || message.includes('hi') || message.includes('hello')) {
                resolve('你好！我是DeepSeek AI助手，很高兴为你服务。有什么我可以帮助你的吗？');
            } else if (message.includes('吃饭') || message.includes('吃了吗')) {
                resolve('我是AI助手，不需要吃饭，但谢谢你的关心！你吃饭了吗？希望你今天吃得开心。');
            } else if (message.includes('时间') || message.includes('日期')) {
                const now = new Date();
                resolve(`现在是 ${now.toLocaleString('zh-CN')}。`);
            } else if (message.includes('帮助') || message.includes('功能') || message.includes('help')) {
                resolve('我可以回答问题、提供信息、和你聊天、帮助解决问题等。你可以尝试问我任何问题！');
            } else if (message.includes('天气')) {
                resolve('很抱歉，作为一个本地运行的演示版本，我无法获取实时天气信息。在完整版本中，我可以连接到天气API为您提供准确的天气预报。');
            } else if (message.includes('笑话') || message.includes('joke')) {
                const jokes = [
                    '为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 = Dec 25。',
                    '一个程序员走进一家酒吧，点了一杯啤酒。酒保问："要不要再来一杯？" 程序员回答："不，那会导致无限循环。"',
                    '有人问："为什么程序员不喜欢户外活动？" 答案是："糟糕的UI设计。"'
                ];
                resolve(jokes[Math.floor(Math.random() * jokes.length)]);
            } else if (message.includes('谢谢') || message.includes('感谢')) {
                resolve('不客气！很高兴能帮到你。如果还有其他问题，随时可以问我。');
            } else {
                const responses = [
                    '我理解你的问题了。由于当前是演示版本，我只能提供有限的回复。在完整版本中，我会根据你的问题提供更详细和准确的回答。',
                    '这是个很好的问题！在演示模式下，我无法提供完整的回答，但在正式版本中，我会为你提供详细的解答。',
                    '感谢你的提问。目前我是在本地运行的演示版本，功能有限。完整版本将能够更好地回答你的问题。',
                    '我很想回答这个问题，但由于CORS限制，我无法连接到实际的API。这只是一个本地演示，展示了界面的功能。'
                ];
                resolve(responses[Math.floor(Math.random() * responses.length)]);
            }
        }, 1000); // 模拟1秒的网络延迟
    });
}

// 在开发环境中替换API调用函数
const isDevelopment = false; // 设置为false表示使用真实API环境

if (isDevelopment) {
    // 覆盖原始API调用函数
    callChatAPI = mockApiCall;
}

// 初始化应用
init(); 

// 主题切换功能
function setupThemeToggle() {
    // 从localStorage获取主题设置，如果没有则默认为light
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    
    // 主题切换按钮点击事件
    themeSwitch.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        
        // 添加过渡效果类
        document.body.classList.add('theme-transition');
        
        // 切换主题
        setTimeout(() => {
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon();
            
            // 调试输出，确认主题已经切换
            console.log('Theme switched to:', newTheme);
        }, 50);
        
        // 移除过渡效果类
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 500);
    });
}

// 更新主题图标
function updateThemeIcon() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    themeSwitch.innerHTML = isDark 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
}

// 背景效果设置
function setupBackgroundEffects() {
    const dots = document.querySelectorAll('.dot');
    
    // 让装饰点随鼠标移动
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        dots.forEach((dot, index) => {
            const offsetX = (index + 1) * 5 * (x - 0.5);
            const offsetY = (index + 1) * 5 * (y - 0.5);
            dot.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${1 + (index * 0.02)})`;
        });
    });
}

// 加载对话
function loadConversations() {
    const saved = localStorage.getItem('conversations');
    if (saved) {
        conversations = JSON.parse(saved);
    }
    
    // 如果没有当前对话ID或当前ID不在已保存的对话中
    if (!currentChatId || !conversations[currentChatId]) {
        // 检查是否有任何保存的对话
        const ids = Object.keys(conversations);
        if (ids.length > 0) {
            // 使用最近的对话
            currentChatId = ids[ids.length - 1];
        } else {
            // 创建新对话
            currentChatId = generateId();
            conversations[currentChatId] = {
                title: '新对话',
                messages: [],
                timestamp: Date.now()
            };
            saveConversations();
        }
    }
    
    // 加载当前对话消息
    renderMessages(conversations[currentChatId].messages);
    updateChatTitle();
}

// 保存对话到本地存储
function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
}

// 渲染单个消息
function renderMessage(message) {
    const { role, content } = message;
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${role}-message`);
    
    // 添加加载动画效果
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(10px)';
    
    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    
    if (role === 'user') {
        avatar.textContent = '用';
    } else {
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-robot');
        avatar.appendChild(icon);
    }
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    // 处理代码块和特殊格式
    messageContent.innerHTML = formatMessageContent(content);
    
    messageElement.appendChild(avatar);
    messageElement.appendChild(messageContent);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 应用淡入动画
    setTimeout(() => {
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
        messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    }, 50);
    
    updateEmptyState();
}

// 渲染所有消息
function renderMessages(messages) {
    chatMessages.innerHTML = '';
    
    if (messages && messages.length > 0) {
        messages.forEach(message => {
            if (message.type === 'files') {
                renderFileMessage(message);
            } else {
                renderMessage(message);
            }
        });
    }
    
    updateEmptyState();
}

// 格式化消息内容，处理代码块和特殊格式
function formatMessageContent(content) {
    // 替换代码块
    let formatted = content.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
    });
    
    // 替换内联代码
    formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
        return `<code>${escapeHtml(code)}</code>`;
    });
    
    // 将普通文本中的换行符转换为<br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    // 添加关键词高亮
    const keywords = ['AI', 'DeepSeek', '大模型', '人工智能'];
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        formatted = formatted.replace(regex, `<span class="highlight-tech">${keyword}</span>`);
    });
    
    return formatted;
}

// 转义HTML特殊字符
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 模拟API响应
function simulateApiResponse(userMessage) {
    // 添加到队列
    messagesQueue.push(userMessage);
    processQueue();
}

// 处理消息队列
function processQueue() {
    if (isProcessing || messagesQueue.length === 0) return;
    
    isProcessing = true;
    const userMessage = messagesQueue.shift();
    
    // 添加思考中指示
    const thinkingEl = document.createElement('div');
    thinkingEl.classList.add('message', 'ai-message', 'thinking');
    
    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-robot');
    avatar.appendChild(icon);
    
    const content = document.createElement('div');
    content.classList.add('message-content');
    content.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    
    thinkingEl.appendChild(avatar);
    thinkingEl.appendChild(content);
    chatMessages.appendChild(thinkingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 模拟思考时间
    setTimeout(() => {
        // 移除思考指示器
        chatMessages.removeChild(thinkingEl);
        
        // 生成回复
        let response;
        
        // 根据用户输入选择响应
        if (userMessage.includes('你好') || userMessage.includes('hi') || userMessage.includes('hello')) {
            response = "你好！我是DeepSeek AI助手，很高兴能帮助你。今天有什么我可以协助你的吗？";
        } else if (userMessage.includes('谢谢') || userMessage.includes('thank')) {
            response = "不客气！如果还有其他问题，随时可以问我。";
        } else if (userMessage.includes('时间') || userMessage.includes('日期')) {
            const now = new Date();
            response = `现在的时间是: ${now.toLocaleString()}`;
        } else if (userMessage.includes('帮助') || userMessage.includes('help')) {
            response = "我可以回答问题、提供信息、帮你解决问题或者陪你聊天。有什么具体的事情需要我帮忙吗？";
        } else if (userMessage.includes('模型') || userMessage.includes('大模型')) {
            response = "DeepSeek是一个强大的人工智能大模型，可以进行自然语言理解、生成和对话。我能够帮助你完成各种任务，从回答问题到创建内容，再到解决复杂问题。";
        } else {
            response = "我收到了你的消息。作为AI助手，我会尽力提供有用的回答和支持。你还有其他问题或需要我做什么吗？";
        }
        
        // 添加AI回复
        addMessage('ai', response);
        
        isProcessing = false;
        processQueue(); // 处理队列中的下一条消息
    }, 1500);
}

// 更新空状态显示
function updateEmptyState() {
    if (conversations[currentChatId] && conversations[currentChatId].messages.length > 0) {
        chatMessages.style.display = 'flex';
        emptyState.style.display = 'none';
    } else {
        chatMessages.style.display = 'none';
        emptyState.style.display = 'flex';
    }
}

// 生成唯一ID
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// 更新聊天标题
function updateChatTitle() {
    const titleElement = document.querySelector('.current-chat-title');
    if (titleElement && currentChatId && conversations[currentChatId]) {
        titleElement.textContent = conversations[currentChatId].title;
    }
}

// 基于第一条消息更新对话标题
function updateConversationTitle(message) {
    const title = message.length > 25 ? message.substring(0, 25) + '...' : message;
    conversations[currentChatId].title = title;
    saveConversations();
    updateChatTitle();
    renderHistory();
}

// 渲染历史记录
function renderHistory() {
    // 清空之前的内容
    chatHistory.innerHTML = '';
    
    // 创建已添加的分组标记
    const addedHeaders = {
        today: false,
        yesterday: false,
        earlier: false
    };
    
    // 按时间戳分组对话
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000; // 前一天
    
    // 按时间戳降序排序对话
    const sortedIds = Object.keys(conversations).sort((a, b) => {
        return conversations[b].timestamp - conversations[a].timestamp;
    });
    
    if (sortedIds.length === 0) return;
    
    for (const id of sortedIds) {
        const convo = conversations[id];
        const timestamp = convo.timestamp;
        const date = new Date(timestamp).setHours(0, 0, 0, 0);
        
        // 确定时间分组并确保每个分组只添加一次
        if (date === today && !addedHeaders.today) {
            createHistoryHeader('今天');
            addedHeaders.today = true;
        } else if (date === yesterday && !addedHeaders.yesterday) {
            createHistoryHeader('昨天');
            addedHeaders.yesterday = true;
        } else if (date < yesterday && !addedHeaders.earlier) {
            createHistoryHeader('更早');
            addedHeaders.earlier = true;
        }
        
        createHistoryItem(id, convo.title);
    }
}

// 创建历史记录头
function createHistoryHeader(text) {
    const header = document.createElement('div');
    header.classList.add('history-header');
    header.textContent = text;
    chatHistory.appendChild(header);
}

// 创建历史记录项
function createHistoryItem(id, title) {
    const item = document.createElement('div');
    item.classList.add('history-item');
    if (id === currentChatId) {
        item.classList.add('active');
    }
    
    const span = document.createElement('span');
    span.textContent = title;
    
    const optionsBtn = document.createElement('button');
    optionsBtn.classList.add('options-btn');
    optionsBtn.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';
    
    item.appendChild(span);
    item.appendChild(optionsBtn);
    
    // 点击切换到对话
    item.addEventListener('click', (e) => {
        if (e.target !== optionsBtn && !optionsBtn.contains(e.target)) {
            switchToChat(id);
        }
    });
    
    // 选项按钮点击事件
    optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showChatOptions(id, optionsBtn);
    });
    
    chatHistory.appendChild(item);
}

// 切换到特定对话
function switchToChat(id) {
    if (conversations[id]) {
        currentChatId = id;
        renderMessages(conversations[id].messages);
        updateChatTitle();
        renderHistory();
    }
    
    // 如果在移动视图中，关闭侧边栏
    document.querySelector('.sidebar').classList.remove('active');
}

// 删除对话
function deleteConversation(id) {
    delete conversations[id];
    saveConversations();
    
    // 如果删除的是当前对话，切换到其他对话或创建新对话
    if (id === currentChatId) {
        const ids = Object.keys(conversations);
        if (ids.length > 0) {
            switchToChat(ids[0]);
        } else {
            startNewChat();
        }
    } else {
        renderHistory();
    }
}

// 菜单按钮切换侧边栏（移动视图）
document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.createElement('button');
    menuButton.classList.add('mobile-menu-btn');
    menuButton.innerHTML = '<i class="fa-solid fa-bars"></i>';
    
    const header = document.querySelector('.header');
    header.insertBefore(menuButton, header.firstChild);
    
    menuButton.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    
    // 初始化应用
    init();
});

// 响应键盘快捷键
document.addEventListener('keydown', (e) => {
    // Cmd+K 或 Ctrl+K 开始新对话
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        startNewChat();
    }
    
    // Esc 关闭选项菜单
    if (e.key === 'Escape') {
        const menu = document.querySelector('.chat-options-menu');
        if (menu) menu.remove();
    }
});

// 文件上传处理
function setupFileUploadHandlers() {
    // 文件选择事件
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length === 0) return;
        
        // 添加文件到预览区域
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // 限制文件大小 (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert(`文件 ${file.name} 过大，请上传小于10MB的文件`);
                continue;
            }
            
            selectedFiles.push(file);
        }
        
        // 显示预览
        renderFilePreview();
        
        // 清空文件输入以便于再次选择同一文件
        fileInput.value = '';
    });
    
    // 支持拖放文件
    userInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        userInput.classList.add('drag-over');
    });
    
    userInput.addEventListener('dragleave', () => {
        userInput.classList.remove('drag-over');
    });
    
    userInput.addEventListener('drop', (e) => {
        e.preventDefault();
        userInput.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length === 0) return;
        
        // 添加文件到预览区域
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // 限制文件大小 (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert(`文件 ${file.name} 过大，请上传小于10MB的文件`);
                continue;
            }
            
            selectedFiles.push(file);
        }
        
        // 显示预览
        renderFilePreview();
    });
}

// 渲染文件预览
function renderFilePreview() {
    // 清空预览区域
    filePreviewContainer.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        filePreviewContainer.classList.remove('active');
        return;
    }
    
    filePreviewContainer.classList.add('active');
    
    // 添加每个文件的预览
    selectedFiles.forEach((file, index) => {
        const previewItem = document.createElement('div');
        previewItem.classList.add('file-preview-item');
        
        // 移除按钮
        const removeBtn = document.createElement('div');
        removeBtn.classList.add('remove-file');
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedFiles.splice(index, 1);
            renderFilePreview();
        });
        
        // 检查是否是图片
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                previewItem.appendChild(img);
            };
            reader.readAsDataURL(file);
        } else {
            // 非图片文件显示图标
            const iconEl = document.createElement('div');
            iconEl.classList.add('file-icon');
            
            let iconClass = 'fa-file';
            
            // 根据文件类型选择图标
            if (file.type.includes('pdf')) {
                iconClass = 'fa-file-pdf';
            } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                iconClass = 'fa-file-word';
            } else if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
                iconClass = 'fa-file-excel';
            } else if (file.type.includes('text') || file.name.endsWith('.txt')) {
                iconClass = 'fa-file-alt';
            } else if (file.type.includes('zip') || file.type.includes('rar') || file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
                iconClass = 'fa-file-archive';
            }
            
            iconEl.innerHTML = `<i class="fas ${iconClass}"></i>`;
            previewItem.appendChild(iconEl);
            
            // 显示文件名
            const nameEl = document.createElement('div');
            nameEl.classList.add('file-name');
            nameEl.textContent = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
            previewItem.appendChild(nameEl);
        }
        
        previewItem.appendChild(removeBtn);
        filePreviewContainer.appendChild(previewItem);
    });
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + ' KB';
    } else {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

// 处理发送消息
function handleSendMessage() {
    console.log('handleSendMessage called');
    const message = userInput.value.trim();
    const hasFiles = selectedFiles && selectedFiles.length > 0;
    
    console.log('Message:', message);
    console.log('Has files:', hasFiles);
    
    if (message || hasFiles) {
        // 添加消息内容
        if (message) {
            // 如果有文本消息
            console.log('Adding user message to chat');
            // 调用sendMessage函数处理用户消息
            sendMessage();
            return;
        }
        
        // 处理文件
        if (hasFiles) {
            processSelectedFiles();
        }
        
        // 清空输入
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // 更新对话标题（如果是第一条消息）
        if (activeChat && activeChat.messages.length === 1) {
            updateChatTitle();
        }
    }
}

// 处理选中的文件
function processSelectedFiles() {
    // 创建文件消息
    const fileMessage = {
        role: 'user',
        type: 'files',
        files: [],
        timestamp: Date.now()
    };
    
    // 处理每个文件
    const filePromises = selectedFiles.map(file => {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => {
                fileMessage.files.push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result
                });
                resolve();
            };
            reader.readAsDataURL(file);
        });
    });
    
    // 所有文件处理完成后添加到对话
    Promise.all(filePromises).then(() => {
        conversations[currentChatId].messages.push(fileMessage);
        saveConversations();
        renderFileMessage(fileMessage);
        
        // 清空选中的文件
        selectedFiles = [];
        renderFilePreview();
    });
}

// 渲染文件消息
function renderFileMessage(message) {
    const { files } = message;
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user-message');
    
    // 添加加载动画效果
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(10px)';
    
    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.textContent = '用';
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    // 添加文件
    files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.classList.add('file-in-message');
        
        if (file.type.startsWith('image/')) {
            // 图片文件
            const img = document.createElement('img');
            img.src = file.data;
            img.alt = file.name;
            fileElement.appendChild(img);
        } else {
            // 非图片文件
            const fileCard = document.createElement('div');
            fileCard.classList.add('file-card');
            
            // 文件图标
            const iconEl = document.createElement('div');
            iconEl.classList.add('file-icon');
            
            let iconClass = 'fa-file';
            
            // 根据文件类型选择图标
            if (file.type.includes('pdf')) {
                iconClass = 'fa-file-pdf';
            } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                iconClass = 'fa-file-word';
            } else if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
                iconClass = 'fa-file-excel';
            } else if (file.type.includes('text') || file.name.endsWith('.txt')) {
                iconClass = 'fa-file-alt';
            } else if (file.type.includes('zip') || file.type.includes('rar') || file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
                iconClass = 'fa-file-archive';
            }
            
            iconEl.innerHTML = `<i class="fas ${iconClass}"></i>`;
            
            // 文件详情
            const detailsEl = document.createElement('div');
            detailsEl.classList.add('file-details');
            
            const nameEl = document.createElement('div');
            nameEl.classList.add('file-name');
            nameEl.textContent = file.name;
            
            const sizeEl = document.createElement('div');
            sizeEl.classList.add('file-size');
            sizeEl.textContent = formatFileSize(file.size);
            
            detailsEl.appendChild(nameEl);
            detailsEl.appendChild(sizeEl);
            
            // 下载按钮
            const downloadBtn = document.createElement('a');
            downloadBtn.classList.add('download-btn');
            downloadBtn.href = file.data;
            downloadBtn.download = file.name;
            downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
            
            fileCard.appendChild(iconEl);
            fileCard.appendChild(detailsEl);
            fileCard.appendChild(downloadBtn);
            
            fileElement.appendChild(fileCard);
        }
        
        messageContent.appendChild(fileElement);
    });
    
    messageElement.appendChild(avatar);
    messageElement.appendChild(messageContent);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 应用淡入动画
    setTimeout(() => {
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
        messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    }, 50);
    
    updateEmptyState();
}

// 渲染所有消息
function renderMessages(messages) {
    chatMessages.innerHTML = '';
    
    if (messages && messages.length > 0) {
        messages.forEach(message => {
            if (message.type === 'files') {
                renderFileMessage(message);
            } else {
                renderMessage(message);
            }
        });
    }
    
    updateEmptyState();
}

// 更新空状态显示
function updateEmptyState() {
    if (conversations[currentChatId] && conversations[currentChatId].messages.length > 0) {
        chatMessages.style.display = 'flex';
        emptyState.style.display = 'none';
    } else {
        chatMessages.style.display = 'none';
        emptyState.style.display = 'flex';
    }
}

// 处理输入键
function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
}

// 直接添加发送按钮点击事件（确保在DOM加载后运行）
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    const sendBtn = document.getElementById('send-button');
    if (sendBtn) {
        console.log('Send button found');
        sendBtn.addEventListener('click', function(e) {
            console.log('Send button clicked via event listener');
            e.preventDefault();
            handleSendMessage();
        });
    } else {
        console.error('Send button not found');
    }
});

// 初始化聊天UI
function initChatUI() {
    console.log('Initializing chat UI...');
    
    // 确保DOM元素存在
    const sendButtonCheck = document.getElementById('send-button');
    if (!sendButtonCheck) {
        console.error('Send button not found in initChatUI');
    } else {
        console.log('Send button found in initChatUI');
        // 直接添加事件监听器
        sendButtonCheck.addEventListener('click', function(e) {
            console.log('Send button clicked (initChatUI)');
            e.preventDefault();
            handleSendMessage();
        });
    }
    
    // 如果没有聊天记录，创建一个默认的
    if (chats.length === 0) {
        chats.push(defaultChat);
        activeChat = defaultChat;
        saveChats();
    } else {
        // 设置最新的聊天为活动聊天
        activeChat = chats[0];
    }
    
    // 自动聚焦输入框
    userInput.focus();
    
    // 强制清空并重新渲染历史记录，确保没有重复
    chatHistory.innerHTML = '';
    renderHistory();
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，初始化界面');
    
    // 清空左侧列表，防止重复
    const chatHistory = document.querySelector('.chat-history');
    if (chatHistory) {
        chatHistory.innerHTML = '';
    }
    
    // 加载聊天数据
    loadConversations();
    
    // 初始化界面
    initChatUI();
    
    // 尝试渲染历史记录
    renderHistory();
});

// 调用聊天API（流式响应版本）
async function callChatAPIStream(message, onChunk) {
    try {
        if (DEBUG) console.log('调用流式API...');
        
        // 开发环境中使用模拟流式响应
        if (ENV === 'development' && USE_CORS_PROXY) {
            console.warn('开发环境使用模拟流式响应');
            
            // 简单的模拟流式响应
            const mockResponse = await mockApiCall(message);
            // 将模拟响应拆分为多个小块，模拟流式传输
            const chunks = mockResponse.split(' ');
            
            for (const chunk of chunks) {
                // 模拟网络延迟
                await new Promise(resolve => setTimeout(resolve, 100));
                // 调用回调函数处理每个数据块
                onChunk(chunk + ' ');
            }
            
            return;
        }
        
        // 生产环境或不使用CORS代理时，使用真实API调用
        // 检查API密钥是否设置
        if (!API_KEY && ENV !== 'development') {
            throw new Error('API密钥未设置，请在API设置中配置您的火山引擎API密钥');
        }
        
        // 构建API请求参数
        const requestData = {
            model: MODEL_ID,
            stream: true,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                {
                    role: "user",
                    content: message
                }
            ]
        };
        
        // 如果有聊天历史记录，添加到请求中
        if (activeChat && activeChat.messages.length > 0) {
            const messageHistory = [];
            
            // 添加前几条对话历史
            for (let i = 0; i < activeChat.messages.length - 1; i++) {
                const msg = activeChat.messages[i];
                messageHistory.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            }
            
            // 如果有历史消息，使用历史消息和当前消息
            if (messageHistory.length > 0) {
                requestData.messages = [
                    {
                        role: "system",
                        content: "You are a helpful assistant."
                    },
                    ...messageHistory,
                    {
                        role: "user",
                        content: message
                    }
                ];
            }
        }
        
        console.log('API流式请求数据:', requestData);
        console.log('API端点:', API_ENDPOINT);
        
        if (DEBUG) console.log('API密钥:', API_KEY ? `${API_KEY.substring(0, 5)}...` : '未设置');
        
        // 根据环境配置请求头
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 在直接调用时添加Authorization头，在使用后端代理时可能不需要
        if (ENV !== 'production') {
            headers['Authorization'] = `Bearer ${API_KEY}`;
        }
        
        // 尝试使用fetch API发送请求
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData),
            });
            
            if (DEBUG) console.log('API响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API错误响应:', errorText);
                throw new Error(`HTTP错误! 状态: ${response.status}, 响应: ${errorText}`);
            }
            
            // 检查是否是流式响应
            if (!response.body) {
                console.error('响应没有body流');
                throw new Error('API响应不支持流式读取');
            }
            
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (DEBUG) console.log('流式响应完成');
                    break;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                if (DEBUG) console.log('收到数据块:', chunk);
                
                // 处理SSE格式的数据
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const jsonStr = line.slice(5).trim();
                        if (jsonStr === '[DONE]') continue;
                        
                        try {
                            const jsonData = JSON.parse(jsonStr);
                            if (jsonData.choices && jsonData.choices.length > 0) {
                                const content = jsonData.choices[0].delta?.content || '';
                                if (content) {
                                    fullResponse += content;
                                    onChunk(content);
                                }
                            }
                        } catch (e) {
                            console.error('解析SSE数据出错:', e, jsonStr);
                        }
                    }
                }
            }
            
            if (DEBUG) console.log('流式响应完整结果:', fullResponse);
            return fullResponse || '抱歉，未收到有效响应';
        } catch (fetchError) {
            console.error('Fetch API错误:', fetchError);
            
            // 如果是在开发环境中遇到错误，尝试使用模拟响应
            if (ENV === 'development') {
                console.warn('流式API调用失败，回退到模拟响应');
                // 简单的模拟流式响应
                const mockResponse = await mockApiCall(message);
                // 将模拟响应拆分为多个小块，模拟流式传输
                const chunks = mockResponse.split(' ');
                
                for (const chunk of chunks) {
                    // 模拟网络延迟
                    await new Promise(resolve => setTimeout(resolve, 100));
                    // 调用回调函数处理每个数据块
                    onChunk(chunk + ' ');
                }
                
                return mockResponse;
            }
            
            throw fetchError;
        }
    } catch (error) {
        console.error('API流式调用失败:', error);
        throw error;
    }
}