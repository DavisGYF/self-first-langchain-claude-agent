# RAG 功能详细实现分析

## 概述

本文档详细分析 web-chat 项目中 RAG（检索增强生成）功能的完整实现流程，包括文件上传、后台处理、检索和问答的每个环节。

---

## 一、文件上传流程

### 1.1 前端上传界面

**文件位置**: `components/KnowledgeBase.tsx`

#### 核心代码行号与功能说明：


| 行号      | 代码内容                                                   | 功能说明                     |
| ------- | ------------------------------------------------------ | ------------------------ |
| 173-181 | `<input type="file" accept=".pdf,.txt,.md,.markdown">` | 文件选择输入框，支持 PDF/TXT/MD 格式 |
| 40-75   | `processFileUpload()` 函数                               | 核心上传处理函数                 |
| 44-45   | `formData.append("file", file)`                        | 将文件添加到 FormData          |
| 48-51   | `fetch("/api/knowledge/upload", { method: "POST" })`   | 调用后端上传 API               |
| 84-89   | `handleDrop()` 拖拽事件处理                                  | 支持拖拽上传                   |
| 92-101  | `handleDragOver/Leave()` 拖拽状态管理                        | UI 交互反馈                  |


```typescript
// components/KnowledgeBase.tsx 第 40-75 行
const processFileUpload = async (file: File) => {
  setIsUploading(true);
  setUploadProgress("正在上传...");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/knowledge/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      setUploadProgress("处理中...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await fetchDocuments();  // 更新文档列表
      setUploadProgress(`成功添加 ${data.chunks} 个文本块`);
    }
  } catch (error) {
    setUploadProgress(`上传失败：${(error as Error).message}`);
  } finally {
    setIsUploading(false);
  }
};
```

---

### 1.2 后端上传 API 处理

**文件位置**: `app/api/knowledge/upload/route.ts`

#### 核心代码行号与功能说明：


| 行号    | 代码内容                                      | 功能说明                      |
| ----- | ----------------------------------------- | ------------------------- |
| 5     | `const MAX_FILE_SIZE = 10 * 1024 * 1024;` | 定义最大文件大小 10MB             |
| 9-10  | `request.formData()`                      | 解析 multipart/form-data 请求 |
| 20-25 | 文件大小验证                                    | 检查文件是否超过 10MB             |
| 28-34 | 文件类型验证                                    | 仅允许 PDF/TXT/MD/markdown   |
| 37-38 | `file.arrayBuffer() -> Buffer.from()`     | 读取文件内容为二进制缓冲区             |
| 41    | `parseFileContent(buffer, file.name)`     | **调用 rag.ts 解析文件内容**      |
| 51    | `uploadDocument(file.name, content)`      | **调用 rag.ts 上传到知识库**      |


```typescript
// app/api/knowledge/upload/route.ts 第 36-52 行
// 读取文件内容
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

// 解析文件内容
const content = await parseFileContent(buffer, file.name);

if (!content || content.trim().length === 0) {
  return new Response(JSON.stringify({ error: '文件内容为空' }), ...);
}

// 上传到知识库
const result = await uploadDocument(file.name, content);
```

---

## 二、文件解析与文本分割

### 2.1 文件内容解析

**文件位置**: `lib/rag.ts`

#### 核心代码行号与功能说明：


| 行号      | 代码内容                    | 功能说明                      |
| ------- | ----------------------- | ------------------------- |
| 125-135 | `parsePDF()` 函数         | 使用 pdf-parse 库解析 PDF 文件   |
| 140-142 | `parseText()` 函数        | 纯文本文件直接转为 UTF-8 字符串       |
| 147-149 | `parseMarkdown()` 函数    | Markdown 文件直接转为 UTF-8 字符串 |
| 154-157 | `getFileExtension()` 函数 | 提取文件扩展名                   |
| 162-178 | `parseFileContent()` 函数 | 根据文件类型分发解析器               |


```typescript
// lib/rag.ts 第 125-135 行 - PDF 解析
export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse(buffer);
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    console.error('PDF 解析失败:', error);
    throw new Error('PDF 解析失败，请确保已安装 pdf-parse 依赖');
  }
}

// lib/rag.ts 第 162-178 行 - 文件类型分发
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

---

### 2.2 文本分割（Chunking）

**文件位置**: `lib/rag.ts`

#### 核心代码行号与功能说明：


| 行号      | 代码内容                   | 功能说明                                   |
| ------- | ---------------------- | -------------------------------------- |
| 114-120 | `getTextSplitter()` 函数 | 配置文本分割器参数                              |
| 183-233 | `uploadDocument()` 函数  | 核心上传逻辑，包含分割和关键词提取                      |
| 191-199 | `splitDocuments()`     | 使用 RecursiveCharacterTextSplitter 分割文本 |
| 202-213 | 循环处理每个 chunk           | 为每个文本块提取关键词                            |


**分割参数配置**：

- `chunkSize`: 1000 字符（每个文本块的最大长度）
- `chunkOverlap`: 200 字符（相邻块的重叠部分）
- `separators`: `['\n\n', '\n', '.', '。', '，', ',', ' ', '']`

```typescript
// lib/rag.ts 第 114-120 行 - 文本分割器配置
export function getTextSplitter() {
  return new RecursiveCharacterTextSplitter({
    chunkSize: 1000,      // 每块最多 1000 字符
    chunkOverlap: 200,    // 重叠 200 字符以保持上下文
    separators: ['\n\n', '\n', '.', '。', '，', ',', ' ', ''],
  });
}

// lib/rag.ts 第 183-224 行 - 文档上传主流程
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

    // 为每个文档块提取关键词
    const newDocs: StoredDocument[] = [];
    for (const doc of docs) {
      const keywords = extractKeywords(doc.pageContent);  // 提取关键词
      newDocs.push({
        content: doc.pageContent,
        keywords,
        metadata: {
          source: doc.metadata.source as string,
          uploadedAt: doc.metadata.uploadedAt as string,
        },
      });
    }

    // 保存到缓存文件
    cachedDocs = loadCachedDocs();
    cachedDocs.push(...newDocs);
    saveCachedDocs(cachedDocs);

    return {
      success: true,
      chunks: docs.length,
      message: `成功添加 ${docs.length} 个文本块`,
    };
  } catch (error) {
    console.error('上传文档失败:', error);
    return {
      success: false,
      chunks: 0,
      message: `上传失败：${(error as Error).message}`,
    };
  }
}
```

---

### 2.3 关键词提取算法

**文件位置**: `lib/rag.ts`

#### 核心代码行号与功能说明：


| 行号    | 代码内容                   | 功能说明               |
| ----- | ---------------------- | ------------------ |
| 49-65 | `extractKeywords()` 函数 | 提取中英文关键词           |
| 53-54 | `\b[a-zA-Z]{3,}\b`     | 正则提取英文单词（至少 3 个字母） |
| 57-58 | `[\u4e00-\u9fa5]`      | 提取单个中文字符           |
| 61-62 | `[\u4e00-\u9fa5]{2,4}` | 提取 2-4 个连续中文字词组    |


```typescript
// lib/rag.ts 第 49-65 行 - 关键词提取
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

---

## 三、文档存储结构

### 3.1 数据存储方式

**文件位置**: `lib/rag.ts`


| 行号    | 代码内容                                                                      | 功能说明          |
| ----- | ------------------------------------------------------------------------- | ------------- |
| 7     | `const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), 'knowledge_base');` | 知识库根目录        |
| 24    | `const COLLECTION_NAME = 'knowledge_base';`                               | 集合名称          |
| 28-38 | `loadCachedDocs()`                                                        | 从 JSON 文件加载文档 |
| 41-44 | `saveCachedDocs()`                                                        | 保存文档到 JSON 文件 |


**存储路径**: `./knowledge_base/knowledge_base.json`

**数据结构**:

```json
[
  {
    "content": "文本块内容...",
    "keywords": ["RAG", "检索", "增强", "生成"],
    "metadata": {
      "source": "example.pdf",
      "uploadedAt": "2024-03-31T12:00:00.000Z"
    }
  }
]
```

---

## 四、文档检索流程

### 4.1 检索 API

**文件位置**: `app/api/chat/route.ts`

#### 核心代码行号与功能说明：


| 行号    | 代码内容                            | 功能说明               |
| ----- | ------------------------------- | ------------------ |
| 49-67 | `if (useRag)` 条件块               | RAG 模式下的检索逻辑       |
| 51    | `retrieveDocuments(message, 3)` | 调用检索函数，返回最相关 3 个文档 |
| 54    | `formatContext(documents)`      | 格式化检索结果为上下文字符串     |
| 55-59 | 构建 retrievedDocs 数组             | 准备发送给前端的引用信息       |


```typescript
// app/api/chat/route.ts 第 49-67 行 - RAG 检索
if (useRag) {
  try {
    const documents = await retrieveDocuments(message, 3);  // 检索最相关 3 个文档
    // 只有检索到相关内容时才使用 RAG
    if (documents.length > 0) {
      context = formatContext(documents);  // 格式化上下文
      retrievedDocs = documents.map((doc: any) => ({
        source: doc.metadata.source,
        content: doc.pageContent.substring(0, 200) + '...',
      }));
      hasRelevantDocs = true;
    } else {
      console.log('RAG: 未找到相关内容，使用普通模式');
    }
  } catch (error) {
    console.warn('RAG 检索失败，使用普通模式:', error);
  }
}
```

---

### 4.2 检索算法实现

**文件位置**: `lib/rag.ts`

#### 核心代码行号与功能说明：


| 行号      | 代码内容                     | 功能说明                |
| ------- | ------------------------ | ------------------- |
| 86-109  | `retrieveDocuments()` 函数 | 核心检索函数              |
| 93      | `extractKeywords(query)` | 提取查询关键词             |
| 96-99   | 计算匹配得分                   | 遍历所有文档计算关键词匹配度      |
| 102-103 | 排序并取 Top-K               | 按得分降序，返回得分>0 的前 K 个 |
| 70-81   | `calculateMatchScore()`  | 关键词匹配评分算法           |


```typescript
// lib/rag.ts 第 86-109 行 - 检索函数
export async function retrieveDocuments(query: string, topK: number = 3): Promise<Document[]> {
  cachedDocs = loadCachedDocs();

  if (cachedDocs.length === 0) {
    return [];
  }

  const queryKeywords = extractKeywords(query);  // 提取查询关键词

  // 计算所有文档的匹配得分
  const scoredDocs = cachedDocs.map((doc) => ({
    ...doc,
    score: calculateMatchScore(doc.keywords, queryKeywords),  // 计算匹配分
  }));

  // 按得分排序并取前 K 个
  scoredDocs.sort((a, b) => b.score - a.score);
  const topDocs = scoredDocs.filter(d => d.score > 0).slice(0, topK);

  return topDocs.map(doc => new Document({
    pageContent: doc.content,
    metadata: doc.metadata,
  }));
}

// lib/rag.ts 第 70-81 行 - 匹配评分
function calculateMatchScore(docKeywords: string[], queryKeywords: string[]): number {
  let score = 0;
  const docSet = new Set(docKeywords);

  queryKeywords.forEach(keyword => {
    if (docSet.has(keyword)) {
      score++;
    }
  });

  return score / Math.max(queryKeywords.length, 1);  // 归一化得分 [0,1]
}
```

---

## 五、对话与答案生成

### 5.1 构建系统提示词

**文件位置**: `app/api/chat/route.ts`

#### 核心代码行号与功能说明：


| 行号     | 代码内容              | 功能说明           |
| ------ | ----------------- | -------------- |
| 77-84  | `systemPrompt` 构建 | 有检索结果时注入知识库上下文 |
| 87-104 | 消息历史构建            | 添加系统提示和历史对话    |
| 107    | 添加当前用户问题          | 最终的消息列表        |
| 70-74  | `ChatOpenAI` 实例化  | 创建大模型客户端       |


```typescript
// app/api/chat/route.ts 第 76-108 行 - 构建消息
// 构建系统提示词（只有检索到相关内容时才使用）
const systemPrompt = hasRelevantDocs
  ? `以下是从知识库中检索到的相关信息，请基于这些信息回答用户的问题。如果信息不足以回答问题，可以结合你的通用知识补充。

【相关知识】
${context}

请根据以上信息回答用户的问题。`
  : '';

// 构建消息历史
const messages: Array<HumanMessage | AIMessage> = [];

// 添加系统提示词
if (systemPrompt) {
  messages.push(new HumanMessage(systemPrompt));
}

// 添加历史消息（限制最多 20 条以节省 token）
const maxHistory = 20;
const recentHistory = history.slice(-maxHistory);

for (const msg of recentHistory) {
  if (msg.role === 'user') {
    messages.push(new HumanMessage(msg.content));
  } else {
    messages.push(new AIMessage(msg.content));
  }
}

// 添加当前消息
messages.push(new HumanMessage(message));
```

---

### 5.2 流式响应

**文件位置**: `app/api/chat/route.ts`

#### 核心代码行号与功能说明：


| 行号      | 代码内容                           | 功能说明      |
| ------- | ------------------------------ | --------- |
| 110     | `await model.stream(messages)` | 流式调用大模型   |
| 115-145 | `ReadableStream` 构造            | 自定义流式响应格式 |
| 119-128 | 先发送元数据                         | 检索到的文档信息  |
| 130-135 | 逐块发送回答内容                       | SSE 流式输出  |
| 137     | `[DONE]` 结束标记                  | 客户端接收完成信号 |


```typescript
// app/api/chat/route.ts 第 110-145 行 - 流式响应
const stream = await model.stream(messages);

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

      // 逐块发送回答
      for await (const chunk of stream) {
        if (chunk.content) {
          const data = `data: ${JSON.stringify({ content: chunk.content })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      }
      // 发送结束标记
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    } catch (error) {
      console.error('Stream error:', error);
      controller.error(error);
    } finally {
      controller.close();
    }
  },
});
```

---

## 六、前端接收与展示

### 6.1 SSE 流式接收

**文件位置**: `app/page.tsx`

#### 核心代码行号与功能说明：


| 行号      | 代码内容                        | 功能说明                  |
| ------- | --------------------------- | --------------------- |
| 228-238 | `response.body.getReader()` | 获取流式响应读取器             |
| 240-241 | 解码并分割行                      | `chunk.split("\n\n")` |
| 244     | `line.startsWith("data: ")` | 识别 SSE 数据行            |
| 252-259 | 处理检索文档元数据                   | 更新 `retrievedDocs` 状态 |
| 261-272 | 累积回答内容                      | 实时更新 AI 回复            |


```typescript
// app/page.tsx 第 236-278 行 - 接收流式响应
while (true) {
  const { done, value} = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true});
  const lines = chunk.split("\n\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") break;

      try {
        const parsed = JSON.parse(data);

        // 处理检索到的文档元数据
        if (parsed.metadata && !docsReceived) {
          if (parsed.metadata.usedRag === true) {
            setRetrievedDocs(parsed.metadata.retrievedDocs || []);
          } else {
            setRetrievedDocs([]);
          }
          docsReceived = true;
        }

        // 累积内容
        if (parsed.content) {
          accumulatedContent += parsed.content;
          const updatedMessages = [
            ...newMessages,
            {
              role: "assistant" as const,
              content: accumulatedContent,
              timestamp: Date.now(),
            },
          ];
          updateMessages(updatedMessages);
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
}
```

---

### 6.2 引用来源展示

**文件位置**: `components/MessageItem.tsx`

需要查看 MessageItem 组件来了解如何展示引用来源：