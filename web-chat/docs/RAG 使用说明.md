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
- 直接在聊天框输入问题
- 系统自动从知识库检索相关内容
- AI 回答下方会显示引用的知识来源

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
  "useRag": true
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

## 故障排除

### 上传失败
1. 检查文件大小是否超过 10MB
2. 确认文件格式为 PDF/TXT/MD
3. 查看浏览器控制台错误信息

### 检索无结果
1. 确认已上传文档
2. 问题与知识库内容相关性
3. 检查环境变量配置

### ChromaDB 初始化错误
首次使用会自动创建 `./chroma_db` 目录，确保有写权限。

## 环境变量

```bash
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.deepseek.com/v1
```

## 优化建议

1. **文档质量**：上传清晰、结构化的文档效果更佳
2. **Chunk 大小**：可在 `lib/rag.ts` 中调整 `chunkSize` 和 `chunkOverlap`
3. **检索数量**：默认返回 3 个最相关片段，可在 `retrieveDocuments` 函数调整
