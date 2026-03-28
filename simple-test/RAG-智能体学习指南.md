# AI 智能体开发学习指南（前端版）

> 一份通俗易懂、从零到实战的 AI 智能体学习路径，专为前端开发者设计

---

## 📚 目录

1. [RAG 原理通俗讲解](#1-rag-原理通俗讲解)
2. [RAG vs 微调的区别](#2-rag-vs-微调的区别)
3. [前端转 AI 智能体开发路径](#3-前端转-ai-智能体开发路径)
4. [开源项目推荐](#4-开源项目推荐)
5. [三个可运行模板](#5-三个可运行模板)
6. [开箱即用的 GitHub 仓库](#6-开箱即用的-github-仓库)

---

## 1. RAG 原理通俗讲解

### 一句话讲透 RAG

**RAG = 让 AI 能"查资料"再回答，而不是只凭记忆瞎说。**

### 前端程序员专属类比

把**大模型（AI）**当成一个**超级厉害但记性不好的前端大神**：

- ✅ 会写代码、懂原理
- ❌ 记不住细节、记不住新版本、记不住你的业务
- ❌ 时间久了还会**编答案（幻觉）**

你问他：**"我这个业务系统里的用户权限怎么判断？"**
他不知道你的业务，就会**瞎编**。

### RAG 是干嘛的？

**先把你的业务文档、知识库丢给 AI 当"参考资料"** → AI 回答前，**先去资料里查** → **查到相关内容** → **再结合知识回答**。

### 超通俗流程（4 步秒懂）

```
┌─────────────────────────────────────────────────────────┐
│  第 1 步：把"资料"切成碎片                                  │
│  公司文档 100 篇 → 接口文档 → 前端规范 → 数据库表结构         │
│  ↓                                                      │
│  把这些长文章切成一段段小碎片（像把书撕成一页页纸条）        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  第 2 步：把碎片变成"向量"（理解成：打标签）                   │
│  "用户权限" → 标签 A                                      │
│  "订单流程" → 标签 B                                      │
│  "Vue3 性能优化" → 标签 C                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  第 3 步：你提问时，AI 先"搜索"                               │
│  你问："用户怎么判断权限？"                               │
│  ↓                                                      │
│  RAG 去所有碎片里，搜索最相关的几段                         │
│  （像在掘金/百度/内网文档搜关键词）                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  第 4 步：把搜到的资料丢给 AI，让 AI 整理回答                  │
│  AI 拿到资料后："哦，原来你家业务是这样的，我懂了。"        │
│  ↓                                                      │
│  然后才给你回答                                          │
└─────────────────────────────────────────────────────────┘
```

### 最终结论

| 对比 | 说明 |
|------|------|
| **没有 RAG 的 AI** | 闭卷考试 — 会的就说，不会的就瞎编 |
| **有 RAG 的 AI** | 开卷考试 — 不会就翻书，翻到再回答 |

### 前端视角理解

| 概念 | 前端类比 |
|------|----------|
| **AI** | 大脑（负责理解、生成） |
| **向量库** | 数据库（存你的业务资料） |
| **检索** | 接口请求（查相关资料） |

**整个流程：**
1. 用户提问
2. 系统去"数据库"查相关资料
3. 把问题 + 资料一起发给 AI
4. AI 基于资料回答

### RAG 解决的 3 个致命问题

1. **AI 不会瞎编了**（因为有资料依据）
2. **AI 能知道你的业务**（传统 AI 不知道）
3. **AI 能知道最新知识**（不用重新训练）

---

## 2. RAG vs 微调的区别

### 核心类比（一句话记住）

| 技术 | 类比 |
|------|------|
| **RAG** | 给 AI 配"查资料的功能"（开卷考试，临时查） |
| **微调（Fine-tune）** | 给 AI"补课、记知识点"（闭卷考试，记脑子里） |

### 场景拆解：让 AI 掌握公司独有的前端组件库

#### 场景 1：用 RAG 实现

**操作方式：**
1. 把组件库文档、使用示例、常见问题丢进 RAG 的"资料库"
2. 用户问："公司组件库的表格怎么加自定义筛选？"
3. AI 先去资料库搜"表格 + 自定义筛选 + 公司组件库 v3.2"，找到对应文档片段
4. AI 拿着这些片段，整理出答案

**特点：**
- ✅ 不用改 AI 本身，只需要喂"资料"
- ✅ 文档改了（比如组件库更版），直接更新资料库就行
- ✅ AI 回答时"看着资料说"，不会记错
- ⚠️ 每次都要查，稍慢
- 🎯 **适合：** 资料经常更新、内容多、不想折腾 AI 本身

#### 场景 2：用微调（Fine-tune）实现

**操作方式：**
1. 把组件库文档、示例、问题整理成"问答对"，做"训练集"
2. 把训练集喂给 AI，让 AI 花几个小时"学习"
3. 学习完后，AI 把这些知识点"记在脑子里"
4. 用户问同样的问题，AI 不用查资料，直接凭记忆回答

**特点：**
- ⚠️ 要改 AI 本身，相当于给 AI"刷机升级"
- ❌ 文档改了，得重新做训练集、重新微调，麻烦
- ✅ AI 回答快，不用查资料
- ⚠️ 记多了可能记混（比如记成旧版本）
- 🎯 **适合：** 资料固定、要高频问、追求回答速度

### 一张表对比

| 维度 | RAG（查资料） | 微调（记知识点） |
|------|--------------|----------------|
| **核心逻辑** | 开卷考试，边查边答 | 闭卷考试，记熟了答 |
| **操作难度** | 简单（丢文档就行） | 复杂（要做训练集、等训练） |
| **更新成本** | 低（改文档 = 改答案） | 高（改文档要重新训练） |
| **回答速度** | 稍慢（要查资料） | 快（直接记忆） |
| **适合场景** | 业务文档常更、内容多 | 知识点固定、高频问 |
| **前端类比** | 写代码时查 MDN/公司文档 | 把常用 API 背下来直接写 |

### 极端例子帮助理解

- **只用 RAG**：就像你写代码时，每写一行都要查文档，但能保证代码最新、没错
- **只用微调**：就像你把所有文档背下来，写代码不用查，但背的是旧文档，新功能不知道
- **最佳实践**：先微调记核心知识点（如组件库基础用法），再用 RAG 查最新细节（如 v3.2 新增功能）

### 总结建议

| 需求 | 选择 |
|------|------|
| 想让 AI 懂"实时/常更资料" | 用 **RAG** |
| 想让 AI 把"固定知识点"记牢、回答更快 | 用 **微调** |
| 前端做 AI 应用（智能文档、客服） | **90% 先上 RAG 就够**，微调是后期优化用的 |

---

## 3. 前端转 AI 智能体开发路径

### 核心优势

AI 智能体不是"造模型"，而是"让 AI 能自主完成任务"。前端的核心价值：

- ✅ **懂交互**：能做智能体的可视化界面
- ✅ **懂工程化**：能把 AI 接口、工具串起来
- ✅ **懂用户体验**：能解决智能体"答非所问、操作复杂"的问题

**简单说：算法工程师造"大脑"，你造"智能体的身体 + 交互界面"。**

### 落地路径（分 3 步）

#### 第一步：打基础（2-3 周）

**目标：** 把前端技术和 AI 接口打通，先做"能对话的 AI 应用"

**必学内容：**

1. **AI 接口调用**
   - 调用 OpenAI/Claude/LangChain 的 API（就是前端调接口，换个 URL）
   - 核心概念：`Prompt`（给 AI 的指令）、`Function Call`（让 AI 调用工具）

2. **智能体核心逻辑（简化版）**
   ```
   用户需求 → AI 拆解任务 → AI 调用工具 → AI 整理结果 → 反馈给用户
   ```
   - 用前端代码定义"AI 能调用的工具"（如：查用户数据的接口）
   - 把工具列表通过 Prompt 告诉 AI，让 AI 选对应的工具调用

**练手项目：**

| 项目 | 技术栈 | 功能 |
|------|--------|------|
| **AI 代码助手** | Vue/React + OpenAI API + CodeMirror | 用户输入需求，AI 返回代码，可直接编辑/运行 |
| **业务智能客服** | React/Vue + RAG + 企业微信/钉钉接口 | 用户问业务问题，智能体查文档 + 调用接口，整理回答 |

#### 第二步：做实战项目（1-2 个月）

**聚焦垂直场景，做"小而精"的智能体**

**成功方向推荐：**

1. **前端开发智能体**
   - 场景：帮前端自动写业务组件、查 bug、优化代码
   - 落地点：整合 RAG（公司组件库、业务文档）+ 工具调用（ESLint、Prettier）
   - 形式：VS Code 插件（前端做插件比算法工程师快）

2. **业务自动化智能体**
   - 场景：运营/客服自动化（电商智能客服、后台操作自动化）
   - 落地点：可视化配置界面 + LangChain 套壳

3. **低代码 + AI 智能体**
   - 场景：给低代码平台加 AI 能力，"说需求，自动生成页面"
   - 落地点：用户输入需求 → AI 生成组件配置 JSON → 渲染成页面

#### 第三步：补核心能力（长期）

**不用成算法专家，重点补 3 个能力：**

1. **Prompt 工程**（核心中的核心）
   - 用前端逻辑思维，写让 AI 能精准执行的指令
   - 示例：*"当用户问'xxx 的权限'时，先调用 getUserPermission 工具，参数是 userId，拿到结果后再回答，不要瞎编"*

2. **工具封装能力**
   - 把业务接口、数据库、第三方服务封装成 AI 能调用的格式
   - 前端天天写接口封装，这是你的主场

3. **RAG 落地能力**
   - 用 Pinecone/Chroma 做向量库（SDK 像用 axios 一样简单）
   - 用 LangChain 做文档拆分、检索（npm 安装就能用）

### 成功经验（避坑 + 捷径）

1. ❌ **别上来就啃算法/模型** — 核心是"应用层落地"，不是"造模型"
2. ✅ **聚焦"垂直场景"** — 不做通用 AI，做"前端专属/公司业务专属"
3. ✅ **复用前端技术栈** — Node.js 做后端，Vue/React 做前端，TS 做类型约束
4. ✅ **先套壳，再优化** — 初期直接用 LangChain/Claude API，跑通后再优化
5. ✅ **找业务场景落地** — 解决公司的实际问题，经验就值钱了

---

## 4. 开源项目推荐

### 入门级（1-2 周可复刻）

| 项目 | 亮点 | 技术栈 | 源码 |
|------|------|--------|------|
| [Chatbot UI](https://github.com/mckaywrigley/chatbot-ui) | 最干净的前端 AI 对话框架，支持工具调用、流式响应 | React + TS + Vercel AI SDK | [GitHub](https://github.com/mckaywrigley/chatbot-ui) |
| [AutoGPT-Web](https://github.com/oursky/auto-gpt-web) | 目标设定、任务拆解、多轮工具调用、思考步骤可视化 | React + Redux + LangChain.js | [GitHub](https://github.com/oursky/auto-gpt-web) |
| [Page-Agent](https://github.com/alibaba/page-agent) | 一行 JS 让 LLM 直接操作页面 DOM，填表单、点按钮 | 纯前端 JS + LLM API | [GitHub](https://github.com/alibaba/page-agent) |

### 进阶级（1-2 个月，可落地到公司）

| 项目 | 亮点 | 技术栈 |
|------|------|--------|
| [Frontegg AI Agent Example](https://github.com/frontegg/frontegg-ai-agent-example) | 带认证、用户上下文、第三方工具集成（Slack/Jira）的企业模板 | React + Express + LangChain |
| 智语 ZhiTalk | 完整的简历分析、模拟面试、优化建议 | Next.js + LangChain.js + Pinecone |
| [LangChain Agent Chat UI](https://github.com/langchain-ai/langchainjs) | LangChain 官方配套智能体聊天 UI，支持流式、工具调用日志 | React + LangChain.js |

### 实战级（企业落地）

| 项目 | 亮点 | 技术栈 | 源码 |
|------|------|--------|------|
| [Parlant](https://github.com/emcie-co/parlant) | 行为可控、符合业务规则、可解释的对话智能体，适合生产环境 | React + TS + Python + LangChain | [GitHub](https://github.com/emcie-co/parlant) |
| 私有组件库代码生成 Agent | Figma 转代码 + 私有组件库 RAG + 浏览器实时预览 | React + LangChain.js + RAG | - |

### 抄作业建议

1. 先从 **Chatbot UI** 或 **Page-Agent** 开始，1 天就能看到效果
2. 垂直场景优先：前端代码助手、公司文档问答、后台操作自动化
3. 技术栈复用：React/Vue + Node.js + LangChain.js
4. 先套壳再优化：先用开源框架搭外壳，再慢慢调 Prompt、加 RAG

---

## 5. 三个可运行模板

> React + TypeScript 实现，替换 API Key 即可运行

### 模板 1：基础对话智能体（带流式响应）

**核心功能：** 复刻 ChatGPT 基础对话、流式响应、对话历史

**技术栈：** React + TypeScript + Vercel AI SDK + OpenAI API

```tsx
// App.tsx
import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiMessage = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        aiMessage += decoder.decode(value);
        setMessages([...newMessages, { role: 'assistant', content: aiMessage }]);
      }
    } catch (error) {
      console.error('Error:', error);
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>基础 AI 对话智能体</h1>
      <div style={{ height: '500px', border: '1px solid #eee', padding: '10px', overflow: 'auto' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ margin: '10px 0', padding: '8px', borderRadius: '4px', background: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5' }}>
            <strong>{msg.role === 'user' ? '你' : 'AI'}：</strong>
            <div style={{ marginTop: '4px' }}>{msg.content}</div>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          style={{ flex: 1, padding: '10px', fontSize: '14px' }}
          placeholder="输入你的问题..."
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 20px' }}>
          {loading ? '发送中...' : '发送'}
        </button>
      </form>
    </div>
  );
}
```

**后端接口（Next.js）：**

```typescript
// pages/api/chat.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { messages } = req.body;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    stream: true,
    messages,
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
```

**运行步骤：**
1. `npx create-next-app@latest ai-agent --typescript`
2. `npm install ai openai`
3. 创建 `.env.local`：`OPENAI_API_KEY=你的 sk-xxxx`
4. 替换上述代码，`npm run dev` 启动

---

### 模板 2：工具调用智能体

**核心功能：** AI 自主判断是否调用工具（查天气、计算器等）

**技术栈：** React + LangChain.js + Express

**后端代码：**

```javascript
// server.js
const express = require('express');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { AgentExecutor, createOpenAIToolsAgent } = require('langchain/agents');
const { ChatPromptTemplate } = require('langchain/prompts');
require('dotenv').config();

const app = express();
app.use(express.json());

// 定义工具
const tools = [
  // 计算器工具
  {
    name: 'calculator',
    description: '执行数学计算',
    func: async (expression) => {
      try {
        return eval(expression);
      } catch (e) {
        return '计算错误';
      }
    },
  },
  // 天气查询工具（示例）
  {
    name: 'getWeather',
    description: '查询指定城市的天气',
    func: async (city) => {
      return `${city}今天的天气是晴，温度 25℃`;
    },
  },
];

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-3.5-turbo',
});

app.post('/api/agent', async (req, res) => {
  const { input } = req.body;

  const agent = await createOpenAIToolsAgent({
    llm: model,
    tools,
    prompt: ChatPromptTemplate.fromMessages([
      ['system', '你是一个能调用工具的智能体'],
      ['user', '{input}'],
    ]),
  });

  const agentExecutor = new AgentExecutor({ agent, tools });
  const result = await agentExecutor.invoke({ input });
  res.json({ answer: result.output });
});

app.listen(3001, () => console.log('Server running on port 3001'));
```

**前端代码：**

```tsx
// App.tsx
import { useState } from 'react';

export default function ToolAgent() {
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const callAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    const response = await fetch('http://localhost:3001/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    const data = await response.json();
    setAnswer(data.answer);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>AI 工具调用智能体</h1>
      <form onSubmit={callAgent} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1, padding: '10px' }}
          placeholder="例如：北京今天天气？100+200 等于多少？"
        />
        <button type="submit" disabled={loading}>
          {loading ? '思考中...' : '发送'}
        </button>
      </form>
      <div style={{ border: '1px solid #eee', padding: '20px', minHeight: '100px', background: '#f9f9f9' }}>
        {loading ? 'AI 正在调用工具...' : answer || '等待你的提问...'}
      </div>
      <p style={{ color: '#666', marginTop: '10px' }}>支持工具：天气查询、计算器</p>
    </div>
  );
}
```

---

### 模板 3：RAG 文档问答智能体

**核心功能：** 上传文档 → 拆分 → 向量入库 → 基于文档问答

**技术栈：** React + LangChain.js + ChromaDB

**后端代码：**

```javascript
// server.js
const express = require('express');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { Chroma } = require('langchain/vectorstores/chroma');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { RetrievalQAChain } = require('langchain/chains');
require('dotenv').config();

const app = express();
app.use(express.json());

const embeddings = new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY });
const model = new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY, modelName: 'gpt-3.5-turbo' });

// 上传文档并入库
app.post('/api/upload', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '无文档内容' });

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const docs = await splitter.createDocuments([text]);

  const vectorStore = await Chroma.fromDocuments(docs, embeddings, {
    collectionName: 'company-docs',
    url: 'http://localhost:8000',
  });

  res.json({ success: true, chunks: docs.length });
});

// 文档问答
app.post('/api/qa', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: '无问题' });

  const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: 'company-docs',
    url: 'http://localhost:8000',
  });

  const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());
  const result = await chain.call({ query: question });

  res.json({ answer: result.text });
});

app.listen(3001, () => console.log('RAG Server running on port 3001'));
```

**前端代码：**

```tsx
// App.tsx
import { useState } from 'react';

export default function RAGAgent() {
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const uploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    const response = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    alert(`文档上传成功！拆分了 ${data.chunks} 个片段`);
    setLoading(false);
  };

  const askQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    const response = await fetch('http://localhost:3001/api/qa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();
    setAnswer(data.answer);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>RAG 文档问答智能体</h1>

      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>📄 上传文档</h3>
        <form onSubmit={uploadDoc}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: '100%', height: '200px', padding: '10px', fontSize: '14px', fontFamily: 'monospace' }}
            placeholder="粘贴你的文档内容（例如公司组件库文档、业务文档）"
          />
          <button type="submit" disabled={loading} style={{ marginTop: '10px', padding: '10px 20px' }}>
            {loading ? '上传中...' : '上传文档'}
          </button>
        </form>
      </div>

      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>💬 文档问答</h3>
        <form onSubmit={askQuestion} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ flex: 1, padding: '10px' }}
            placeholder="基于上传的文档提问..."
          />
          <button type="submit" disabled={loading}>
            {loading ? '检索中...' : '提问'}
          </button>
        </form>
        <div style={{ border: '1px solid #eee', padding: '20px', minHeight: '100px', background: '#f9f9f9' }}>
          {loading ? 'AI 正在检索文档...' : answer || '等待你的提问...'}
        </div>
      </div>
    </div>
  );
}
```

**运行步骤：**
1. 安装依赖：`npm install express langchain chromadb dotenv openai`
2. 启动 ChromaDB：`pip install chromadb && chroma run --host 0.0.0.0 --port 8000`
3. 创建 `.env`：`OPENAI_API_KEY=你的 sk-xxxx`
4. 启动后端：`node server.js`，启动前端：`npm start`

---

## 6. 开箱即用的 GitHub 仓库

> 下载后改 API Key 即可运行，无需修改核心代码

### 精选 5 个仓库（按易到难排序）

#### 1. chatgpt-web（最简对话智能体，纯前端）⭐️推荐入门

| 信息 | 详情 |
|------|------|
| **地址** | https://github.com/Chanzhaoyu/chatgpt-web |
| **功能** | 复刻 ChatGPT 界面，流式响应、对话历史、多模型切换 |
| **难度** | ⭐️（纯前端，零后端） |

**上手步骤：**
```bash
git clone https://github.com/Chanzhaoyu/chatgpt-web.git
cd chatgpt-web
npm install
# 修改 .env 文件
VITE_OPENAI_API_KEY=你的 sk-xxxx
npm run dev
# 访问 http://localhost:3000
```

---

#### 2. simple-llm-agent（极简工具调用智能体）

| 信息 | 详情 |
|------|------|
| **地址** | https://github.com/hwchase17/simple-llm-agent |
| **功能** | LangChain 官方示例，AI 调用计算器、搜索等工具 |
| **难度** | ⭐️⭐️（Node.js 后端 + 前端页面） |

**上手步骤：**
```bash
git clone https://github.com/hwchase17/simple-llm-agent.git
cd simple-llm-agent
npm install
# 创建 .env 文件
echo "OPENAI_API_KEY=你的 sk-xxxx" > .env
node index.js
# 测试：100+200 等于多少？
```

---

#### 3. rag-chatbot-simple（最简 RAG 文档问答）

| 信息 | 详情 |
|------|------|
| **地址** | https://github.com/masoudkarimif/rag-chatbot-simple |
| **功能** | 上传文档 → 向量入库 → 基于文档问答，内置轻量向量库 |
| **难度** | ⭐️⭐️（Node.js + React，内置向量库） |

**上手步骤：**
```bash
git clone https://github.com/masoudkarimif/rag-chatbot-simple.git
cd rag-chatbot-simple
npm install
# 修改 src/config.js
OPENAI_API_KEY: "你的 sk-xxxx"
npm run start
```

---

#### 4. ai-agent-demo（多场景智能体集合）

| 信息 | 详情 |
|------|------|
| **地址** | https://github.com/liyupi/ai-agent-demo |
| **功能** | 对话、工具调用、RAG、思维导图生成 4 个场景 |
| **难度** | ⭐️⭐️（Next.js 全栈，注释详细） |

**上手步骤：**
```bash
git clone https://github.com/liyupi/ai-agent-demo.git
cd ai-agent-demo
npm install
cp .env.example .env
# 修改 .env
OPENAI_API_KEY=你的 sk-xxxx
npm run dev
```

---

#### 5. page-agent（前端 DOM 操作智能体，阿里开源）

| 信息 | 详情 |
|------|------|
| **地址** | https://github.com/alibaba/page-agent |
| **功能** | 一行 JS 让 AI 接管网页 DOM，自动填表单、点按钮 |
| **难度** | ⭐️⭐️（纯前端，直接嵌入网页） |

**上手步骤：**
```bash
git clone https://github.com/alibaba/page-agent.git
cd page-agent
# 打开 examples/basic.html
# 修改：window.PAGE_AGENT_CONFIG.apiKey = "你的 sk-xxxx"
# 浏览器直接打开 basic.html 测试
```

---

### 通用上手步骤

1. **克隆仓库**：确保安装了 Git（https://git-scm.com/downloads）
2. **安装依赖**：进入目录后 `npm install`（需要 Node.js v18+）
3. **替换 API Key**：找到 `.env`/`config.js` 文件，替换你的 Key
4. **启动项目**：执行 README 里的启动命令（通常是 `npm run dev` 或 `npm start`）
5. **访问测试**：浏览器打开 `http://localhost:3000`

---

### 避坑小贴士

| 问题 | 解决方案 |
|------|----------|
| **API Key 无效** | 确认是 OpenAI 的 `sk-` 开头，不是 Claude 的 `sk-ant-` 开头 |
| **网络超时** | 终端配置代理：`export ALL_PROXY=socks5://127.0.0.1:7890` |
| **依赖安装失败** | 使用国内源：`npm install --registry=https://registry.npmmirror.com` |
| **端口被占用** | 修改配置里的端口（3000 → 3001） |

---

## 📝 总结

### 快速上手路径

```
第 1 周：chatgpt-web → 跑通基础对话
   ↓
第 2 周：simple-llm-agent → 理解工具调用
   ↓
第 3-4 周：rag-chatbot-simple → 掌握 RAG 流程
   ↓
第 2 个月：基于自己的业务场景定制开发
```

### 核心要点

1. **前端优势**：交互 + 工程化 + 用户体验
2. **技术选型**：React/Vue + Node.js + LangChain.js
3. **学习顺序**：对话 → 工具调用 → RAG
4. **落地策略**：垂直场景、先套壳再优化、解决实际问题

---

> 📅 最后更新：2024 年
> 🎯 适用人群：想转型 AI 智能体开发的前端工程师
