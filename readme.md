# AI Self-First Agent

一个基于 Next.js 14、LangChain 和 DeepSeek LLM 的现代化 AI 聊天应用，支持**RAG（检索增强生成）**功能。

## ✨ 功能特性

- 🤖 **智能对话** - 基于 DeepSeek LLM 的流式响应
- 📚 **RAG 知识库** - 上传 PDF/TXT/MD 文档，AI 基于你的资料回答
- 🔄 **模式切换** - RAG ON/OFF 一键切换普通模式和知识库模式
- 💬 **对话历史** - 支持上下文记忆和多轮对话
- ⚡ **实时推送** - Server-Sent Events 流式输出
- 🎨 **现代 UI** - Tailwind CSS + Lucide Icons 美化界面
- 📊 **引用展示** - 显示 RAG 检索的知识来源

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 pnpm

### 安装依赖

```bash
cd web-chat
npm install
```

### 配置环境变量

编辑 `web-chat/.env.local`:

```env
LLM_API_KEY=your_deepseek_api_key
LLM_BASE_URL=https://api.deepseek.com/v1
```

### 启动开发服务器

```bash
cd web-chat
npm run dev
```

访问 http://localhost:3000

## 📖 RAG 功能使用

### 1. 上传文档
- 页面右侧有"知识库"面板
- 点击上传区域选择文件（PDF/TXT/MD，最大 10MB）

### 2. 切换模式
- 点击右上角 **RAG ON/OFF** 按钮
- **RAG ON**: AI 会先从知识库检索相关内容再回答
- **RAG OFF**: 普通对话模式，不使用知识库

### 3. 智能问答
- 输入问题，系统自动从知识库检索相关内容（RAG 模式下）
- AI 回答下方显示引用的知识来源

### 4. 管理文档
- 查看已上传文档列表
- 删除不需要的文档

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 16.2.1 |
| UI 框架 | React 19.2.4 |
| 样式 | Tailwind CSS 4 |
| 图标 | Lucide React |
| LLM | DeepSeek Chat |
| LangChain | @langchain/openai, @langchain/community |
| 向量数据库 | ChromaDB |
| PDF 解析 | pdf-parse |

## 📁 项目结构

```
self-firstAgent/
├── web-chat/                 # Web 聊天应用
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts           # 聊天 API（含 RAG）
│   │   │   └── knowledge/              # 知识库 API
│   │   ├── components/
│   │   │   └── KnowledgeBase.tsx       # 知识库组件
│   │   ├── lib/
│   │   │   └── rag.ts                  # RAG 核心服务
│   │   ├── docs/                       # 文档
│   │   └── test-docs/                  # 测试文档
│   ├── .env.local                      # 环境变量
│   ├── .npmrc                          # npm 镜像配置
│   └── package.json
└── README.md
```

## 🔧 API 接口

### 上传文档
```http
POST /api/knowledge/upload
Content-Type: multipart/form-data
```

### 获取文档列表
```http
GET /api/knowledge
```

### 删除文档
```http
DELETE /api/knowledge?filename=xxx
```

### RAG 聊天
```http
POST /api/chat
Content-Type: application/json

{
  "message": "你的问题",
  "history": [],
  "useRag": true
}
```

## 📝 开发笔记

### 国内镜像加速
已配置 `.npmrc` 使用 npmmirror.com：
```
registry=https://registry.npmmirror.com
```

### 字体优化
由于网络原因无法加载 Google Fonts，已改用系统字体。

### ChromaDB 存储
向量数据存储在 `./chroma_db` 目录，首次使用时自动创建。

## 🐛 故障排除

### 上传失败
- 检查文件大小是否超过 10MB
- 确认文件格式为 PDF/TXT/MD

### 检索无结果
- 确认已上传文档到知识库
- 检查问题与知识库内容的相关性

### API 调用失败
- 验证 `LLM_API_KEY` 是否正确
- 检查网络连接

## 📄 License

MIT
