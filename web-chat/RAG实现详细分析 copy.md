# RAG 功能实现详细分析

## 1. 系统架构概述

该 RAG（检索增强生成）系统采用了基于关键词匹配的本地文档检索方案，主要包含以下核心组件：

- **前端界面**：KnowledgeBase.tsx - 文档上传和管理界面
- **后端 API**：
  - `/api/knowledge/upload` - 文档上传处理
  - `/api/knowledge` - 文档列表获取和删除
  - `/api/chat` - 集成 RAG 的聊天接口
- **核心逻辑**：`lib/rag.ts` - RAG 核心功能实现

## 2. 文件上传完整流程

### 2.1 前端上传流程（KnowledgeBase.tsx）

**触发位置**：第 78-81 行，第 84-89 行

```typescript
// 处理输入框选择文件
const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) processFileUpload(file);
}

// 处理拖拽放置
const handleDrop = (event: React.DragEvent) => {
  event.preventDefault();
  setIsDragOver(false);
  const file = event.dataTransfer.files?.[0];
  if (file) processFileUpload(file);
}
```

**文件处理流程**（第 40-75 行）：
1. 用户选择文件或拖拽上传
2. 调用 `processFileUpload(file)` 函数
3. 创建 FormData 对象并添加文件
4. 发送 POST 请求到 `/api/knowledge/upload`
5. 处理响应结果并更新 UI

### 2.2 后端上传接口（/api/knowledge/upload/route.ts）

**入口函数**：第 7 行 `export async function POST(request: NextRequest)`

#### 2.2.1 文件验证阶段（第 12-34 行）

```typescript
// 检查文件是否存在
if (!file) {
  return new Response(
    JSON.stringify({ error: '未找到文件' }),
    { status: 400 }
  );
}

// 检查文件大小（限制 10MB）
if (file.size > MAX_FILE_SIZE) {
  return new Response(
    JSON.stringify({ error: '文件大小不能超过 10MB' }),
    { status: 400 }
  );
}

// 检查文件类型
const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'text/x-markdown'];
if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|md|markdown)$/i)) {
  return new Response(
    JSON.stringify({ error: '仅支持 PDF、TXT 和 Markdown 文件' }),
    { status: 400 }
  );
}
```

#### 2.2.2 文件内容解析阶段（第 36-48 行）

```typescript
// 读取文件内容
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

// 解析文件内容
const content = await parseFileContent(buffer, file.name);

if (!content || content.trim().length === 0) {
  return new Response(
    JSON.stringify({ error: '文件内容为空' }),
    { status: 400 }
  );
}
```

**文件内容解析**（lib/rag.ts 第 162-178 行）：

```typescript
export async function parseFileContent(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = getFileExtension(filename);

  switch (ext) {
    case 'pdf':
      return parsePDF(buffer);
    case 'md':
    case 'markdown':
      return parseMarkdown(buffer);
    case 'txt':
    default:
      return parseText(buffer);
  }
}
```

**各类文件解析函数**：
- **PDF 解析**（第 125-135 行）：使用 `pdf-parse` 库提取文本
- **Markdown 解析**（第 147-149 行）：直接转换为 UTF-8 字符串
- **文本文件解析**（第 140-142 行）：直接转换为 UTF-8 字符串

#### 2.2.3 文档处理阶段（第 51-68 行）

```typescript
// 上传到知识库
const result = await uploadDocument(file.name, content);

if (result.success) {
  return new Response(
    JSON.stringify({
      success: true,
      filename: file.name,
      chunks: result.chunks,
      message: result.message,
    }),
    { status: 200 }
  );
}
```

### 2.3 文档处理核心逻辑（lib/rag.ts）

#### 2.3.1 文本分割（第 183-225 行）

```typescript
export async function uploadDocument(
  filename: string,
  content: string
): Promise<{ success: boolean; chunks: number; message: string }> {
  try {
    const splitter = getTextSplitter();

    // 分割文本
    const docs = await splitter.splitDocuments([
      new Document({
        pageContent: content,
        metadata: {
          source: filename,
          uploadedAt: new Date().toISOString(),
        },
      }),
    ]);
```

**文本分割器配置**（第 114-120 行）：

```typescript
export function getTextSplitter() {
  return new RecursiveCharacterTextSplitter({
    chunkSize: 1000,        // 每个文本块 1000 字符
    chunkOverlap: 200,       // 重叠 200 字符
    separators: ['\n\n', '\n', '.', '。', '，', ',', ' ', ''],
  });
}
```

#### 2.3.2 关键词提取（第 199-213 行）

```typescript
// 为每个文档块提取关键词
const newDocs: StoredDocument[] = [];
for (const doc of docs) {
  const keywords = extractKeywords(doc.pageContent);
  newDocs.push({
    content: doc.pageContent,
    keywords,
    metadata: {
      source: doc.metadata.source as string,
      uploadedAt: doc.metadata.uploadedAt as string,
    },
  });
}
```

**关键词提取算法**（第 49-65 行）：

```typescript
function extractKeywords(text: string): string[] {
  const keywords: Set<string> = new Set();

  // 提取英文单词（至少 3 个字母）
  const englishWords = text.match(/\b[a-zA-Z]{3,}\b/g);
  englishWords?.forEach(word => keywords.add(word.toLowerCase()));

  // 提取中文字符作为关键词（每个字作为一个关键词）
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  chineseChars?.forEach(char => keywords.add(char));

  // 提取连续的中文词组（2-4 个字）
  const chinesePhrases = text.match(/[\u4e00-\u9fa5]{2,4}/g);
  chinesePhrases?.forEach(phrase => keywords.add(phrase));

  return Array.from(keywords);
}
```

#### 2.3.3 数据存储（第 215-218 行）

```typescript
// 加载现有文档并添加新文档
cachedDocs = loadCachedDocs();
cachedDocs.push(...newDocs);
saveCachedDocs(cachedDocs);
```

**数据存储机制**（第 28-44 行）：

```typescript
// 从缓存文件加载文档
function loadCachedDocs(): StoredDocument[] {
  const cachePath = path.join(KNOWLEDGE_BASE_PATH, `${COLLECTION_NAME}.json`);
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

// 保存文档到缓存文件
function saveCachedDocs(docs: StoredDocument[]): void {
  const cachePath = path.join(KNOWLEDGE_BASE_PATH, `${COLLECTION_NAME}.json`);
  fs.writeFileSync(cachePath, JSON.stringify(docs, null, 2));
}
```

**数据存储路径**（第 7 行）：
```typescript
const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), 'knowledge_base');
```

## 3. RAG 检索流程

### 3.1 检索触发（app/api/chat/route.ts 第 49-67 行）

```typescript
// RAG 检索相关文档
if (useRag) {
  try {
    const documents = await retrieveDocuments(message, 3);
    // 只有检索到相关内容时才使用 RAG
    if (documents.length > 0) {
      context = formatContext(documents);
      retrievedDocs = documents.map((doc: any) => ({
        source: doc.metadata.source,
        content: doc.pageContent.substring(0, 200) + '...',
      }));
      hasRelevantDocs = true;
    }
  } catch (error) {
    console.warn('RAG 检索失败，使用普通模式:', error);
  }
}
```

### 3.2 文档检索算法（lib/rag.ts 第 86-109 行）

```typescript
export async function retrieveDocuments(query: string, topK: number = 3): Promise<Document[]> {
  cachedDocs = loadCachedDocs();

  if (cachedDocs.length === 0) {
    return [];
  }

  const queryKeywords = extractKeywords(query);

  // 计算所有文档的匹配得分
  const scoredDocs = cachedDocs.map((doc) => ({
    ...doc,
    score: calculateMatchScore(doc.keywords, queryKeywords),
  }));

  // 按得分排序并取前 K 个
  scoredDocs.sort((a, b) => b.score - a.score);
  const topDocs = scoredDocs.filter(d => d.score > 0).slice(0, topK);

  return topDocs.map(doc => new Document({
    pageContent: doc.content,
    metadata: doc.metadata,
  }));
}
```

### 3.3 匹配度计算（第 70-81 行）

```typescript
function calculateMatchScore(docKeywords: string[], queryKeywords: string[]): number {
  let score = 0;
  const docSet = new Set(docKeywords);

  queryKeywords.forEach(keyword => {
    if (docSet.has(keyword)) {
      score++;
    }
  });

  return score / Math.max(queryKeywords.length, 1);
}
```

### 3.4 上下文格式化（第 289-300 行）

```typescript
export function formatContext(documents: Document[]): string {
  if (documents.length === 0) {
    return '';
  }

  return documents
    .map((doc, index) => {
      return `[来源：${doc.metadata.source}]
${doc.pageContent}`;
    })
    .join('\n\n---\n\n');
}
```

## 4. 系统集成流程

### 4.1 系统提示词构建（app/api/chat/route.ts 第 76-84 行）

```typescript
// 构建系统提示词（只有检索到相关内容时才使用）
const systemPrompt = hasRelevantDocs
  ? `以下是从知识库中检索到的相关信息，请基于这些信息回答用户的问题。如果信息不足以回答问题，可以结合你的通用知识补充。

【相关知识】
${context}

请根据以上信息回答用户的问题。`
  : '';
```

### 4.2 流式响应处理（第 115-145 行）

```typescript
const readableStream = new ReadableStream({
  async start(controller) {
    try {
      // 先发送元数据（只有检索到文档时才发送）
      if (!hasSentMeta && retrievedDocs.length > 0) {
        const meta = JSON.stringify({
          metadata: {
            retrievedDocs,
            usedRag: hasRelevantDocs,
          },
        });
        controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
        hasSentMeta = true;
      }

      for await (const chunk of stream) {
        if (chunk.content) {
          const data = `data: ${JSON.stringify({ content: chunk.content })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      }
      // 发送结束标记
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    }
  },
});
```

## 5. 数据流总结

### 5.1 文件上传数据流
```
用户上传文件
  → 前端验证文件类型和大小
  → 发送 POST /api/knowledge/upload
  → 后端验证并解析文件内容
  → 文本分割为 chunks
  → 提取关键词
  → 保存到本地 JSON 文件
  → 返回成功响应
```

### 5.2 RAG 查询数据流
```
用户发送消息
  → 提取查询关键词
  → 计算与知识库文档的匹配度
  → 选择最相关的 topK 文档
  → 格式化为上下文
  → 构建系统提示词
  → 调用 LLM 生成回答
  → 流式返回结果
```

## 6. 关键特性

1. **本地存储**：使用本地 JSON 文件存储文档，无需外部数据库
2. **关键词匹配**：基于中文和英文关键词的匹配算法
3. **文本分块**：支持重叠的文本分割，提高检索准确性
4. **多格式支持**：PDF、TXT、Markdown 文件格式
5. **流式响应**：支持 SSE 流式返回，提升用户体验
6. **智能降级**：RAG 失败时自动切换到普通模式

## 7. 性能考虑

- **文件大小限制**：10MB 限制避免过大文件
- **文本块大小**：1000 字符块 + 200 字符重叠，平衡检索精度和性能
- **检索数量**：默认返回前 3 个相关文档，控制上下文长度
- **缓存机制**：内存缓存文档列表，减少文件读取
- **自动清理**：定期刷新文档列表，保持数据同步