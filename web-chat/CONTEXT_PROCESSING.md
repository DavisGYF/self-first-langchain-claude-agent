# 🎯 上下文处理完整实现详解

## 📋 目录

1. [对话历史管理](#对话历史管理)
2. [RAG 知识库检索](#rag-知识库检索)
3. [API 上下文构建](#api-上下文构建)
4. [流式响应处理](#流式响应处理)
5. [本地存储机制](#本地存储机制)

---

## 💬 对话历史管理

### 核心 Hook：useChatManager

```typescript
/**
 * 更新当前对话的消息 - 上下文管理的核心函数
 * 每次用户发送消息或 AI 回复时都会调用此函数
 * 负责：1. 保存消息到本地存储 2. 自动生成对话名称 3. 更新时间戳
 */
const updateMessages = (messages: Message[]) => {
  if (!currentChatId) return;

  setSessions(prev => prev.map(session => {
    if (session.id === currentChatId) {
      // 智能对话命名：如果是第一条消息，根据内容生成对话名称
      const name = session.messages.length === 0 && messages.length > 0
        ? generateChatName(messages)  // 提取用户第一条消息的前30个字符作为标题
        : session.name;

      return {
        ...session,
        name,           // 更新对话名称
        messages,       // 更新消息列表（包含完整上下文历史）
        updatedAt: Date.now(), // 更新时间戳用于排序
      };
    }
    return session;
  }));
};

/**
 * 生成对话名称函数
 * 从消息历史中提取有意义的标题
 */
function generateChatName(messages: Message[]): string {
  if (messages.length === 0) return "新对话";

  // 找到第一条用户消息作为对话主题
  const firstUserMessage = messages.find(m => m.role === "user");
  if (firstUserMessage) {
    const name = firstUserMessage.content.slice(0, 30);
    return name + (firstUserMessage.content.length > 30 ? "..." : "");
  }

  return "新对话";
}
```

### 多对话上下文隔离

```typescript
/**
 * 切换到指定对话 - 实现不同对话间的上下文隔离
 * 每个对话都有完全独立的上下文历史
 */
const switchToChat = (chatId: string) => {
  setCurrentChatId(chatId);  // 切换当前对话ID
  setEditingChatId(null);    // 重置编辑状态
};

// 当前对话的上下文获取
const currentChat = sessions.find(s => s.id === currentChatId) || null;
const currentMessages = currentChat?.messages || []; // 当前对话的所有消息历史
```

---

## 🔍 RAG 知识库检索

### 文档检索核心逻辑

```typescript
/**
 * 检索相关文档 - RAG 上下文增强的核心函数
 * 输入：用户问题 + 返回数量限制
 * 输出：最相关的文档片段数组
 */
export async function retrieveDocuments(query: string, topK: number = 3): Promise<Document[]> {
  cachedDocs = loadCachedDocs(); // 从本地缓存加载所有文档

  if (cachedDocs.length === 0) {
    return []; // 知识库为空，返回空结果
  }

  const queryKeywords = extractKeywords(query); // 提取用户问题关键词

  // 计算所有文档的相关性得分
  const scoredDocs = cachedDocs.map((doc) => ({
    ...doc,
    score: calculateMatchScore(doc.keywords, queryKeywords), // 关键词匹配算法
  }));

  // 按相关性排序，只返回有意义的匹配结果
  scoredDocs.sort((a, b) => b.score - a.score);
  const topDocs = scoredDocs.filter(d => d.score > 0).slice(0, topK);

  return topDocs.map(doc => new Document({
    pageContent: doc.content,        // 文档内容
    metadata: doc.metadata,           // 元数据（来源、上传时间等）
  }));
}

/**
 * 关键词提取算法 - 支持中英文混合文本
 * 将用户问题和文档内容都转换为关键词集合进行匹配
 */
function extractKeywords(text: string): string[] {
  const keywords: Set<string> = new Set();

  // 提取英文单词（至少3个字母，避免无意义的短词）
  const englishWords = text.match(/\b[a-zA-Z]{3,}\b/g);
  englishWords?.forEach(word => keywords.add(word.toLowerCase()));

  // 提取中文字符（每个汉字都作为关键词）
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  chineseChars?.forEach(char => keywords.add(char));

  // 提取中文词组（2-4个字的组合，提高语义准确性）
  const chinesePhrases = text.match(/[\u4e00-\u9fa5]{2,4}/g);
  chinesePhrases?.forEach(phrase => keywords.add(phrase));

  return Array.from(keywords);
}

/**
 * 相关性匹配算法 - 计算文档与查询的匹配度
 * 返回值：0-1之间的分数，分数越高越相关
 */
function calculateMatchScore(docKeywords: string[], queryKeywords: string[]): number {
  let score = 0;
  const docSet = new Set(docKeywords);

  // 统计匹配的关键词数量
  queryKeywords.forEach(keyword => {
    if (docSet.has(keyword)) {
      score++;
    }
  });

  // 归一化处理：匹配数 / 查询关键词总数
  return score / Math.max(queryKeywords.length, 1);
}
```

### 上下文格式化

```typescript
/**
 * 格式化检索结果为 AI 可理解的上下文
 * 将多个文档片段组合成结构化的提示信息
 */
export function formatContext(documents: Document[]): string {
  if (documents.length === 0) {
    return ''; // 无相关文档时返回空字符串
  }

  return documents
    .map((doc, index) => {
      return `[来源：${doc.metadata.source}]
${doc.pageContent}`;
    })
    .join('\n\n---\n\n'); // 用分隔符区分不同文档
}
```

---

## 🤖 API 上下文构建

### 服务端消息处理

```typescript
/**
 * 构建发送给 AI 的完整消息历史
 * 包含：系统提示词 + 对话历史 + 当前问题
 */
export async function POST(request: NextRequest) {
  const { message, history = [], useRag = true } = await request.json();

  // ==================== RAG 检索阶段 ====================
  let context = '';
  let retrievedDocs: any[] = [];
  let hasRelevantDocs = false;

  if (useRag) {
    try {
      const documents = await retrieveDocuments(message, 3); // 检索最相关的3个文档

      if (documents.length > 0) {
        context = formatContext(documents); // 格式化检索结果
        retrievedDocs = documents.map((doc: any) => ({
          source: doc.metadata.source,
          content: doc.pageContent.substring(0, 200) + '...', // 截断显示
        }));
        hasRelevantDocs = true;
      } else {
        console.log('RAG: 未找到相关内容，使用普通模式');
      }
    } catch (error) {
      console.warn('RAG 检索失败，使用普通模式:', error);
    }
  }

  // ==================== 系统提示词构建 ====================
  const systemPrompt = hasRelevantDocs
    ? `以下是从知识库中检索到的相关信息，请基于这些信息回答用户的问题。
    如果信息不足以回答问题，可以结合你的通用知识补充。

【相关知识】
${context}

请根据以上信息回答用户的问题。`
    : ''; // 无相关文档时不添加系统提示

  // ==================== 消息历史构建 ====================
  const messages: Array<HumanMessage | AIMessage> = [];

  // 添加系统提示词（只有检索到相关内容时才添加）
  if (systemPrompt) {
    messages.push(new HumanMessage(systemPrompt));
  }

  // 添加历史对话（限制最多20条以节省token）
  const maxHistory = 20;
  const recentHistory = history.slice(-maxHistory); // 只取最近的对话历史

  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));    // 用户消息
    } else {
      messages.push(new AIMessage(msg.content));       // AI回复
    }
  }

  // 添加当前用户问题
  messages.push(new HumanMessage(message));

  // 后续：调用AI模型并流式返回结果...
}
```

---

## 🌊 流式响应处理

### 实时消息更新

```typescript
/**
 * 前端处理流式响应 - 实时更新消息内容
 * 实现打字机效果，逐字显示AI回复
 */
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || loading || !currentChatId) return;

  const userMessage = input.trim();
  const timestamp = Date.now();
  setInput("");

  // 构建包含用户新消息的临时消息列表
  const newMessages = [
    ...currentMessages,
    { role: "user" as const, content: userMessage, timestamp },
  ];

  setLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        history: newMessages.map(({ role, content }) => ({ role, content })),
        useRag,
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error("无法读取响应流");

    let accumulatedContent = "";
    let docsReceived = false;

    // 实时读取流式响应
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);

            // 处理检索到的文档元数据（首次收到时显示）
            if (parsed.metadata && !docsReceived) {
              if (parsed.metadata.usedRag === true) {
                setRetrievedDocs(parsed.metadata.retrievedDocs || []);
              } else {
                setRetrievedDocs([]);
              }
              docsReceived = true;
            }

            // 实时累积 AI 回复内容
            if (parsed.content) {
              accumulatedContent += parsed.content;
              const updatedMessages = [
                ...newMessages,
                { role: "assistant" as const, content: accumulatedContent, timestamp: Date.now() },
              ];
              updateMessages(updatedMessages); // 实时更新消息显示
            }
          } catch (e) {
            // 忽略解析错误，继续处理后续数据
          }
        }
      }
    }
  } catch (error) {
    // 错误处理：显示错误消息
    if ((error as Error).name !== "AbortError") {
      const errorMessage = `❌ 请求失败：${(error as Error).message}`;
      const updatedMessages = [
        ...newMessages,
        { role: "assistant" as const, content: errorMessage, timestamp: Date.now() },
      ];
      updateMessages(updatedMessages);
    }
  } finally {
    setLoading(false);
  }
};
```

---

## 💾 本地存储机制

### 持久化存储实现

```typescript
// 存储键名和限制配置
const STORAGE_KEY = "chat_sessions";
const MAX_SESSIONS = 50; // 最多保存50个对话，防止存储空间过大

/**
 * 从 localStorage 加载对话列表
 * 应用启动时调用，恢复用户之前的对话历史
 */
function loadSessionsFromStorage(): ChatSession[] {
  if (typeof window === "undefined") return []; // 服务端渲染时返回空数组

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("加载对话列表失败:", error);
    return []; // 解析失败时返回空数组
  }
}

/**
 * 保存对话列表到 localStorage
 * 每次对话更新时自动调用，确保数据持久化
 */
function saveSessionsToStorage(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return; // 服务端不执行存储操作

  try {
    // 限制存储的对话数量，避免占用过多存储空间
    const sessionsToStore = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionsToStore));
  } catch (error) {
    console.error("保存对话列表失败:", error);
  }
}

/**
 * 自动保存机制 - 当对话数据变化时自动触发保存
 */
useEffect(() => {
  if (isLoaded) { // 确保只在数据加载完成后保存
    saveSessionsToStorage(sessions);
  }
}, [sessions, isLoaded]);
```

### 知识库本地缓存

```typescript
// 知识库缓存文件路径
const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), 'knowledge_base');
const COLLECTION_NAME = 'knowledge_base';
let cachedDocs: StoredDocument[] = []; // 内存中的文档缓存

/**
 * 从缓存文件加载文档
 * 避免每次检索都要重新读取和解析所有文档
 */
function loadCachedDocs(): StoredDocument[] {
  const cachePath = path.join(KNOWLEDGE_BASE_PATH, `${COLLECTION_NAME}.json`);
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    } catch {
      return []; // 缓存文件损坏时返回空数组
    }
  }
  return [];
}

/**
 * 保存文档到缓存文件
 * 文档更新时同步更新缓存
 */
function saveCachedDocs(docs: StoredDocument[]): void {
  const cachePath = path.join(KNOWLEDGE_BASE_PATH, `${COLLECTION_NAME}.json`);
  fs.writeFileSync(cachePath, JSON.stringify(docs, null, 2));
}
```

---

## 🎯 上下文处理流程图

```
用户输入问题
    ↓
检查 RAG 开关状态
    ├─── 开启 ───→ 检索知识库文档 ───→ 构建增强上下文 ───┐
    │                                                     ↓
    └─ 关闭 ──────────────────────→ 使用普通上下文 ──→ 合并对话历史
                                                              ↓
                                                       添加系统提示词
                                                              ↓
                                                       限制历史消息数量
                                                              ↓
                                                       发送给 AI 模型
                                                              ↓
                                                       流式返回结果
                                                              ↓
                                                       实时更新界面
                                                              ↓
                                                       保存到本地存储
```

## 🔧 关键特性总结

### ✅ 实现的优化策略

1. **Token 优化**
   - 限制历史消息数量（最多20条）
   - 文档内容截断显示（前200字符）
   - 智能关键词匹配，避免无关内容

2. **性能优化**
   - 本地缓存机制，减少重复计算
   - 流式响应，提升用户体验
   - 异步处理，避免界面卡顿

3. **用户体验**
   - 多对话支持，上下文完全隔离
   - 自动对话命名，便于管理
   - 实时搜索和响应

4. **错误处理**
   - RAG 检索失败时自动降级到普通模式
   - 本地存储异常时的容错处理
   - 网络错误时的友好提示

这个上下文处理系统既强大又灵活，能够根据用户需求智能地在普通对话模式和 RAG 增强模式之间切换，同时保证了良好的性能和用户体验。
