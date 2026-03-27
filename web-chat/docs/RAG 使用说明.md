# RAG (检索增强生成) 功能使用说明

## 功能概述

RAG 功能允许你上传自己的文档（PDF、TXT、Markdown），AI 在回答问题时会先检索知识库中的相关内容，提供更准确、基于你提供的资料的答案。

## 快速开始

### 1. 访问应用
打开浏览器访问：`http://localhost:3000`

### 2. 上传文档
- 页面右侧有"知识库"面板
- 点击上传区域选择文件支持格式：`.pdf`, `.txt`, `.md`
- 文件大小限制：10MB

### 3. 使用 RAG 聊天
- 点击右上角 **RAG ON/OFF** 按钮切换模式
- **RAG ON**: AI 会先从知识库检索相关内容再回答
- **RAG OFF**: 普通对话模式，不使用知识库
- 输入问题，系统自动处理
- AI 回答下方会显示引用的知识来源（RAG 模式下）

## 模式说明

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **RAG ON** | 基于知识库回答 | 需要查询公司文档、技术手册等 |
| **RAG OFF** | 普通对话 | 一般闲聊、通用问题 |

## API 接口文档

### 上传文档
```http
POST /api/knowledge/upload
Content-Type: multipart/form-data

Body: file (二进制文件)
```

响应：
```json
{
  "success": true,
  "filename": "example.pdf",
  "chunks": 5,
  "message": "成功添加 5 个文本块"
}
```

### 获取文档列表
```http
GET /api/knowledge
```

响应：
```json
{
  "success": true,
  "documents": [
    {
      "filename": "example.pdf",
      "chunks": 5,
      "uploadedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

### 删除文档
```http
DELETE /api/knowledge?filename=example.pdf
```

响应：
```json
{
  "success": true,
  "message": "已成功删除 example.pdf"
}
```

### RAG 聊天
```http
POST /api/chat
Content-Type: application/json

{
  "message": "你的问题",
  "history": [],
  "useRag": true  // true=RAG 模式，false=普通模式
}
```

流式响应（Server-Sent Events）：
```
data: {"metadata":{"retrievedDocs":[...],"usedRag":true}}

data: {"content":"回答内容片段 1"}
data: {"content":"回答内容片段 2"}
...
data: [DONE]
```

## 技术架构

### 向量数据库
- **ChromaDB** - 本地轻量级向量存储
- 数据存储在 `./chroma_db` 目录

### 向量化模型
- **OpenAI Embeddings** - 通过 LangChain 调用
- 配置使用 DeepSeek API

### 文本处理
- **RecursiveCharacterTextSplitter** - 递归字符分割
- Chunk 大小：1000 字符
- 重叠：200 字符

### 检索策略
- **Top-K Similarity Search** - 返回最相关的 3 个片段
- 相似度计算：Cosine Similarity

## UI 功能

### 知识库侧边栏
- 📤 上传文档（拖拽或点击）
- 📋 查看已上传文档列表
- 🗑️ 删除不需要的文档
- 🔄 自动刷新（每 30 秒）

### RAG 开关
- 🧠 **RAG ON**: 启用知识库检索
- 💬 **RAG OFF**: 普通对话模式
- 实时切换，无需刷新页面

### 引用展示
- 每个回答下方显示使用的知识来源
- 包含文件名和引用内容摘要

## 故障排除

### 上传失败
1. 检查文件大小是否超过 10MB
2. 确认文件格式为 PDF/TXT/MD
3. 查看浏览器控制台错误信息
4. 确保环境变量配置正确

### 检索无结果
1. 确认已上传文档到知识库
2. 检查 RAG 开关是否开启
3. 问题与知识库内容相关性
4. 尝试更具体的关键词

### ChromaDB 初始化错误
首次使用会自动创建 `./chroma_db` 目录，确保有写权限。

### API 调用失败
1. 验证 `LLM_API_KEY` 是否正确
2. 检查网络连接
3. 确认 DeepSeek API 可用

## 环境变量

```bash
LLM_API_KEY=your_deepseek_api_key
LLM_BASE_URL=https://api.deepseek.com/v1
```

## 优化建议

### 文档质量
1. 上传清晰、结构化的文档效果更佳
2. 避免上传大量重复内容
3. 定期清理过时的文档

### 参数调整
可在 `lib/rag.ts` 中调整：
- `chunkSize`: 文本块大小（默认 1000）
- `chunkOverlap`: 重叠区域（默认 200）
- `topK`: 检索数量（默认 3）

### 性能优化
1. 大文档建议分段上传
2. 定期清理不常用的文档
3. 使用 RAG OFF 模式进行普通对话

## 更新日志

### v1.0.0 (2024-03-27)
- ✅ 实现基础 RAG 功能
- ✅ 支持 PDF/TXT/MD 文档上传
- ✅ 知识库管理界面
- ✅ RAG 开关功能
- ✅ 引用来源展示
- ✅ 国内 npm 镜像加速
