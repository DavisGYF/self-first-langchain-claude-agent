# RAG 功能测试文档

这是一份用于测试 RAG 功能的示例文档。

## 项目信息

- **项目名称**: AI Self-First Agent
- **技术栈**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **AI 框架**: LangChain.js
- **向量数据库**: ChromaDB (本地存储)
- **LLM**: DeepSeek Chat API

## 核心功能

### 1. 智能对话
- 基于 DeepSeek LLM 的流式响应
- 支持上下文记忆（最多 20 条历史消息）
- Markdown 格式渲染

### 2. RAG 知识库
- 上传 PDF/TXT/Markdown 文档
- 自动文本分割（1000 字符/chunk，200 字符重叠）
- Top-3 相似度检索
- 引用来源展示

### 3. 模式切换
- RAG ON: 基于知识库回答
- RAG OFF: 普通对话模式

## 技术细节

### 文本分割配置
```typescript
chunkSize: 1000      // 每个文本块大小
chunkOverlap: 200    // 重叠区域大小
separators: ['\n\n', '\n', '.', '。', '，', ',', ' ', '']
```

### 向量检索
- 使用 OpenAI Embeddings 进行向量化
- Cosine Similarity 相似度计算
- 默认返回 Top-3 最相关片段

### 文件处理
- PDF: 使用 pdf-parse 库解析
- TXT/MD: 直接读取 UTF-8 内容
- 文件大小限制：10MB

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/chat | POST | 聊天接口（支持 RAG） |
| /api/knowledge | GET | 获取文档列表 |
| /api/knowledge | DELETE | 删除指定文档 |
| /api/knowledge/upload | POST | 上传新文档 |

## 环境变量

```env
LLM_API_KEY=your_deepseek_api_key
LLM_BASE_URL=https://api.deepseek.com/v1
```

## 使用说明

1. 启动开发服务器：`npm run dev`
2. 访问 http://localhost:3000
3. 点击右上角"RAG ON"启用知识库模式
4. 在右侧知识库面板上传文档
5. 输入问题，AI 会基于知识库回答

## 故障排除

### 上传失败
- 检查文件大小是否超过 10MB
- 确认文件格式为 PDF/TXT/MD
- 查看浏览器控制台错误信息

### 检索无结果
- 确认已上传文档到知识库
- 检查 RAG 开关是否开启
- 尝试更具体的关键词

### API 调用失败
- 验证 LLM_API_KEY 是否正确
- 检查网络连接
- 确认 DeepSeek API 可用

---

*最后更新：2024 年 3 月*
