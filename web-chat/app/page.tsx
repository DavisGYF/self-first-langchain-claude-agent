// "use client" 指令：标记此文件为客户端组件，必须在浏览器端运行
// 原因：使用了 React hooks (useState, useRef 等) 和浏览器 API (clipboard, DOM 引用)
"use client";

// 导入 React 核心 hooks
// useState: 管理组件状态
// useRef: 创建可变引用，不触发重新渲染
// useEffect: 处理副作用（如事件监听、清理函数）
import { useState, useRef, useEffect } from "react";
// 导入 ReactMarkdown 组件：用于将 Markdown 格式文本渲染为 HTML
import ReactMarkdown from "react-markdown";
// 从 lucide-react 图标库导入各种 UI 图标
import {
  Send,         // 发送按钮图标
  Plus,         // 新建对话图标
  Copy,         // 复制内容图标
  Check,        // 复制成功勾选图标
  Download,     // 导出下载图标
  Sparkles,     // 闪光/推荐图标
  Bot,          // 机器人/AI 图标
  User,         // 用户头像图标
  Database,     // 数据库/知识库图标
  BrainCircuit, // 大脑/神经网络图标（用于 RAG 开关）
  Square,       // 停止生成图标
  Trash2,       // 删除图标
  Edit2,        // 编辑图标
  MessageSquare,// 消息图标
  X,            // 关闭图标
  Menu,         // 菜单图标
} from "lucide-react";
import KnowledgeBase from "@/components/KnowledgeBase";      // 知识库侧边栏组件
import TypingIndicator from "@/components/TypingIndicator";  // AI 输入中指示器组件
import { useChatManager, Message, ChatSession } from "@/hooks/useChatManager"; // 对话管理 Hook

// 检索文档接口定义：RAG 检索到的知识库文档结构
interface RetrievedDoc {
  source: string;  // 文档来源/文件名
  content: string; // 文档内容片段
}

// 预设问题数组：首页展示的推荐问题
const PRESET_QUESTIONS = [
  "RAG 功能是如何工作的？",
  "如何上传文档到知识库？",
  "解释一下 JavaScript 的事件循环机制",
  "React Hooks 的原理是什么？",
];

// 格式化日期显示
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN");
}

// 主页面组件（默认导出）
export default function Home() {
  // ==================== 使用对话管理 Hook ====================
  const {
    sessions,           // 所有对话列表
    currentChatId,      // 当前对话 ID
    currentChat,        // 当前对话对象
    currentMessages,    // 当前对话的消息列表
    isLoaded,           // 是否已加载完成

    editingChatId,      // 正在编辑的对话 ID
    editName,           // 编辑中的名称
    setEditName,        // 设置编辑名称

    createNewChat,      // 创建新对话
    switchToChat,       // 切换对话
    updateMessages,     // 更新消息
    deleteChat,         // 删除对话
    startEditing,       // 开始编辑名称
    saveChatName,       // 保存编辑的名称
    cancelEditing,      // 取消编辑
    updateChatRag,      // 更新 RAG 设置
    exportChat,         // 导出对话
  } = useChatManager();

  // ==================== 本地状态管理 ====================
  const [input, setInput] = useState("");                    // 用户输入框内容
  const [loading, setLoading] = useState(false);             // 是否正在等待 AI 响应
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null); // 已复制消息的索引
  const [retrievedDocs, setRetrievedDocs] = useState<RetrievedDoc[]>([]); // RAG 检索到的文档
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);   // 左侧对话列表展开状态
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true); // 右侧知识库展开状态

  // 检测是否为移动设备
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // 初始化侧边栏状态：桌面端默认打开，移动端默认关闭
  useEffect(() => {
    if (isMobile) {
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
    } else {
      setLeftSidebarOpen(true);
      setRightSidebarOpen(true);
    }
  }, [isMobile]);

  // 从当前对话获取 RAG 设置
  const useRag = currentChat?.useRag ?? true;

  // ==================== Refs 引用 ====================
  const messagesEndRef = useRef<HTMLDivElement>(null);       // 指向消息列表底部的引用
  const streamControllerRef = useRef<AbortController | null>(null); // 控制 SSE 流中断
  const inputRef = useRef<HTMLInputElement>(null);           // 输入框 DOM 引用
  const leftSidebarRef = useRef<HTMLDivElement>(null);       // 左侧边栏引用
  const rightSidebarRef = useRef<HTMLDivElement>(null);      // 右侧边栏引用

  // 滚动到底部函数：当新消息到达时自动滚动视图
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  // 组件卸载时清理：中断任何进行中的 SSE 流连接
  useEffect(() => {
    return () => {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
      }
    };
  }, []);

  // 点击边栏外部关闭（移动端）
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // 左侧边栏
      if (leftSidebarOpen &&
          window.innerWidth < 1024 &&
          leftSidebarRef.current &&
          !leftSidebarRef.current.contains(target)) {
        setLeftSidebarOpen(false);
      }
      // 右侧边栏
      if (rightSidebarOpen &&
          window.innerWidth < 1024 &&
          rightSidebarRef.current &&
          !rightSidebarRef.current.contains(target)) {
        setRightSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [leftSidebarOpen, rightSidebarOpen]);

  // 键盘快捷键处理：Enter 发送消息
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (!loading && input.trim()) {
            handleSubmit(e as unknown as React.FormEvent);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, loading]);

  // ==================== 核心函数：提交消息处理 ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !currentChatId) return;

    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
    }

    const userMessage = input.trim();
    const timestamp = Date.now();
    setInput("");

    // 构建新消息数组（添加用户消息）
    const newMessages = [
      ...currentMessages,
      { role: "user" as const, content: userMessage, timestamp },
    ];

    setLoading(true);
    streamControllerRef.current = new AbortController();

    // 清空之前的检索结果
    setRetrievedDocs([]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: newMessages.map(({ role, content }) => ({ role, content })),
          useRag,
        }),
        signal: streamControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "请求失败");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("无法读取响应流");

      let accumulatedContent = "";
      let docsReceived = false;

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

              // 处理检索到的文档元数据
              if (parsed.metadata && !docsReceived) {
                if (parsed.metadata.usedRag === true) {
                  setRetrievedDocs(parsed.metadata.retrievedDocs || []);
                } else {
                  setRetrievedDocs([]);
                }
                docsReceived = true;
              }

              if (parsed.content) {
                accumulatedContent += parsed.content;
                const updatedMessages = [
                  ...newMessages,
                  { role: "assistant" as const, content: accumulatedContent, timestamp: Date.now() },
                ];
                updateMessages(updatedMessages);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Stream error:", error);
        const errorMessage = `❌ 请求失败：${(error as Error).message}`;
        const updatedMessages = [
          ...newMessages,
          { role: "assistant" as const, content: errorMessage, timestamp: Date.now() },
        ];
        updateMessages(updatedMessages);
      }
    } finally {
      setLoading(false);
      streamControllerRef.current = null;
    }
  };

  // ==================== 辅助函数：开始新对话 ====================
  const handleNewChat = () => {
    createNewChat();
    setRetrievedDocs([]);
    inputRef.current?.focus();
  };

  // ==================== 辅助函数：停止 AI 生成 ====================
  const handleStopGeneration = () => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
      setLoading(false);
    }
  };

  // ==================== 辅助函数：复制消息内容 ====================
  const handleCopy = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ==================== 辅助函数：导出当前对话 ====================
  const handleExport = () => {
    exportChat(currentChatId || undefined);
  };

  // ==================== 辅助函数：处理预设问题点击 ====================
  const handlePresetQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  // ==================== 辅助函数：格式化时间 ====================
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==================== 辅助函数：切换 RAG 设置 ====================
  const handleToggleRag = () => {
    updateChatRag(!useRag);
  };

  // ==================== 辅助函数：编辑完成后聚焦 ====================
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveChatName();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  // ==================== JSX 渲染 ====================
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    // 根容器：全屏高度，渐变背景
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 overflow-hidden">
      {/* 装饰性背景元素 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* 主体内容区域：左右边栏 + 中间聊天区 */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* 左侧边栏：对话列表 */}
        <aside
          ref={leftSidebarRef}
          className={`fixed lg:static inset-y-0 left-0 w-72 bg-black/60 backdrop-blur-xl border-r border-white/10 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
            leftSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
          }`}
        >
          {/* 侧边栏头部 */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              对话列表
            </h2>
            <button
              onClick={() => setLeftSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* 对话列表 */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1 min-h-0">
            {sessions.length === 0 ? (
              <div className="text-center text-gray-500 py-8">暂无对话</div>
            ) : (
              sessions.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative rounded-lg transition-all ${
                    chat.id === currentChatId
                      ? "bg-white/10 border border-indigo-500/50"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div
                    onClick={() => switchToChat(chat.id)}
                    className="p-3 cursor-pointer"
                  >
                    {editingChatId === chat.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={saveChatName}
                        onKeyDown={handleEditKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-black/50 text-white text-sm px-2 py-1 rounded border border-indigo-500 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{chat.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {chat.messages.length} 条消息 · {formatDate(chat.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {editingChatId !== chat.id && (
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(chat.id, chat.name);
                        }}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                        title="重命名"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 侧边栏底部 */}
          <div className="p-4 border-t border-white/10 bg-black/20 flex-shrink-0">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all font-medium"
            >
              <Plus className="w-5 h-5" />
              新建对话
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              共 {sessions.length} 个对话 · 本地存储
            </p>
          </div>
        </aside>

        {/* 中间内容区域 */}
        <div className="flex-1 flex flex-col min-w-0 mx-4 sm:mx-8 lg:mx-0">

          {/* 头部区域 */}
          <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            {/* 左侧菜单按钮（移动端） */}
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-400" />
            </button>

            {/* Logo 和标题 */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center hidden sm:flex">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-white truncate">AI 智能助手</h1>
                <p className="text-xs text-gray-400 hidden sm:block">基于 DeepSeek LLM</p>
              </div>
            </div>

            {/* 右侧功能按钮 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* RAG 开关 */}
              <button
                onClick={handleToggleRag}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors text-xs sm:text-sm ${
                  useRag
                    ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/50"
                    : "bg-white/5 text-gray-400 border border-white/10"
                }`}
                title={useRag ? "RAG 已启用" : "RAG 已禁用"}
              >
                <BrainCircuit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{useRag ? "RAG ON" : "RAG OFF"}</span>
              </button>

              {/* 导出按钮 */}
              <button
                onClick={handleExport}
                disabled={currentMessages.length === 0}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
                title="导出聊天记录"
              >
                <Download className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </button>

              {/* 右侧菜单按钮（移动端） */}
              <button
                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="知识库"
              >
                <Database className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </header>

          {/* 消息列表区域 */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 min-h-full">
              {/* 条件渲染：无消息时显示欢迎界面 */}
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
                  {/* AI 头像图标 */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/30">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  {/* 欢迎标题 */}
                  <h2 className="text-2xl font-bold text-white mb-2">
                    你好，我是你的 AI 助手
                  </h2>
                  {/* 欢迎描述 */}
                  <p className="text-gray-400 mb-8 text-center max-w-md">
                    我可以帮你解答问题、编写代码、创作内容等。随时问我任何问题！
                  </p>

                  {/* 预设问题列表 */}
                  <div className="w-full max-w-lg">
                    <p className="text-sm text-gray-500 mb-4 text-center">
                      试试这些问题
                    </p>
                    <div className="grid gap-3">
                      {PRESET_QUESTIONS.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => handlePresetQuestion(question)}
                          className="w-full text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 rounded-xl transition-all group"
                        >
                          <span className="text-gray-300 group-hover:text-white">
                            {question}
                          </span>
                          <Sparkles className="w-4 h-4 text-indigo-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* 有条件渲染：有消息时遍历显示 */
                currentMessages.map((msg, index) => {
                  const isLastAssistantMsg =
                    msg.role === "assistant" && index === currentMessages.length - 1;
                  const hasSources =
                    isLastAssistantMsg &&
                    retrievedDocs.length > 0 &&
                    retrievedDocs.some((doc) => doc.source && doc.content);

                  return (
                    // 消息容器：用户消息右对齐，AI 消息左对齐
                    <div
                      key={index}
                      className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                    >
                      {/* AI 头像：仅 AI 消息显示 */}
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}

                      {/* 消息内容容器 */}
                      <div
                        className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                      >
                        {/* 消息气泡：用户和 AI 不同样式 */}
                        <div
                          className={`rounded-2xl px-5 py-3 ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                              : "bg-white/10 backdrop-blur-sm text-gray-100 border border-white/10"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div className="prose prose-invert max-w-none text-sm">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {/* RAG 来源展示 */}
                        {hasSources && (
                          <div className="mt-2 p-3 bg-indigo-900/30 backdrop-blur-sm rounded-xl border border-indigo-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Database className="w-4 h-4 text-indigo-400" />
                              <span className="text-xs font-semibold text-indigo-300">
                                知识库引用
                              </span>
                            </div>
                            <div className="space-y-1">
                              {retrievedDocs.map((doc, i) => (
                                <div key={i} className="text-xs">
                                  <span className="text-indigo-400">
                                    {doc.source}
                                  </span>
                                  <p className="text-gray-400 mt-0.5 line-clamp-2">
                                    {doc.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 消息元信息：时间和复制按钮 */}
                        <div
                          className={`flex items-center gap-2 mt-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <span className="text-xs text-gray-500">
                            {formatTime(msg.timestamp)}
                          </span>
                          {msg.role === "assistant" && (
                            <button
                              onClick={() => handleCopy(msg.content, index)}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                              title="复制"
                            >
                              {copiedIndex === index ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 用户头像：仅用户消息显示 */}
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* 加载中指示器 */}
              {loading && (
                <TypingIndicator />
              )}

              {/* 滚动锚点 */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 输入区域 */}
          <div className="relative z-20 bg-black/20 backdrop-blur-xl border-t border-white/10 p-4">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              {/* 输入框容器 */}
              <div className="flex gap-2 sm:gap-3 items-center bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入你的问题... (Enter 发送，Shift+Enter 换行)"
                  disabled={loading}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 px-3 sm:px-4 py-2 focus:outline-none disabled:opacity-50 min-w-0"
                />
                {/* 发送按钮 */}
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-2 sm:p-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all disabled:grayscale flex-shrink-0"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
                {/* 停止生成按钮 */}
                {loading && (
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="p-2 sm:p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl transition-all flex-shrink-0"
                    title="停止生成"
                  >
                    <Square className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                  </button>
                )}
              </div>
              {/* 底部提示文字 */}
              <p className="text-center text-xs text-gray-500 mt-3">
                AI 生成的内容可能有误，请自行核实 •{" "}
                {useRag ? "🧠 RAG 知识库已启用" : "💬 普通对话模式"}
              </p>
            </form>
          </div>
        </div>

        {/* 右侧边栏：知识库 */}
        <aside
          ref={rightSidebarRef}
          className={`fixed lg:static inset-y-0 right-0 w-80 max-w-[70vw] sm:max-w-[50vw] lg:max-w-none bg-black/60 backdrop-blur-xl border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
            rightSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
          }`}
        >
          <KnowledgeBase onClose={() => setRightSidebarOpen(false)} />
        </aside>

        {/* 遮罩层（移动端展开侧边栏时显示） */}
        {(leftSidebarOpen || rightSidebarOpen) && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => {
              setLeftSidebarOpen(false);
              setRightSidebarOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
