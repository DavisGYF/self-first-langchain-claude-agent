# AI 智能助手 - AI Agent Web Chat Interface

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwind-css)
![LangChain](https://img.shields.io/badge/LangChain-1-green?logo=langchain)

**一个现代化的 AI 聊天界面，支持流式响应和对话历史**

</div>

## 📸 效果预览

- 🎨 **现代化深色主题** - Indigo/Purple 渐变配色 + 毛玻璃效果
- ⚡ **流式响应** - AI 回复像打字一样逐字显示
- 💬 **对话历史** - 支持上下文记忆（最多 20 条）
- 📝 **Markdown 渲染** - 代码高亮、列表、链接等
- 📋 **复制功能** - 一键复制消息内容
- 💾 **导出记录** - JSON 格式导出聊天记录
- ⌨️ **快捷键** - Enter 发送，Shift+Enter 换行

## 🛠️ 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Next.js | 16.2.1 | App Router + Turbopack |
| React | 19.2.4 | 前端框架 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 样式方案 |
| LangChain | 1.x | AI 集成 |
| DeepSeek | - | LLM 模型 |

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm 或 pnpm

### 安装依赖
```bash
cd web-chat
npm install
```

### 配置环境变量
创建 `.env.local` 文件：
```env
LLM_API_KEY=你的 API Key
LLM_BASE_URL=https://api.deepseek.com/v1
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

## 📁 项目结构

```
web-chat/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # API 路由 (流式 + 对话历史)
│   ├── globals.css           # 全局样式
│   ├── layout.tsx            # 根布局
│   └── page.tsx              # 主页面
├── .env.local                # 环境变量
├── package.json
└── tailwind.config.ts
```

## ✨ 核心功能实现

### 1. 流式响应
使用 Server-Sent Events (SSE) 实现实时流式输出：
```typescript
// 后端：app/api/chat/route.ts
const stream = await model.stream(messages);
const readableStream = new ReadableStream({
  async start(controller) {
    for await (const chunk of stream) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    }
  }
});
```

### 2. 对话历史
使用 LangChain 的 HumanMessage/AIMessage 构建消息链：
```typescript
const messages = history.map(msg =>
  msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
);
messages.push(new HumanMessage(message));
```

### 3. Markdown 渲染
使用 react-markdown 处理 AI 返回的 Markdown 内容：
```tsx
<ReactMarkdown remarkPlugins={[remarkGithub]}>
  {message.content}
</ReactMarkdown>
```

## 🔧 API 接口

### POST /api/chat
发送消息并获取流式响应

**请求体:**
```json
{
  "message": "你好",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**响应:** SSE 流式数据
```
data: {"content":"你好"}

data: {"content":"！"}

data: [DONE]
```

## 🎯 面试亮点

1. **完整的全栈实现** - Next.js App Router + API Routes
2. **流式响应处理** - SSE + ReadableStream
3. **AI 集成实践** - LangChain + 对话管理
4. **用户体验优化** - 加载状态、错误处理、快捷键
5. **代码质量** - TypeScript 全量类型、组件化设计

## 📄 License

MIT
