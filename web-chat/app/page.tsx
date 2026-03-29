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
  Send, // 发送按钮图标
  Square, // 停止生成图标
  FileImage, // 图片文件图标
} from "lucide-react";
import KnowledgeBase from "@/components/KnowledgeBase"; // 知识库侧边栏组件
import TypingIndicator from "@/components/TypingIndicator"; // AI 输入中指示器组件
import ChatSidebar from "@/components/ChatSidebar";         // 左侧对话列表组件
import ChatHeader from "@/components/ChatHeader";           // 聊天头部组件
import WelcomeScreen from "@/components/WelcomeScreen";     // 欢迎界面组件
import MessageItem from "@/components/MessageItem";         // 消息项组件
import ImageOCR from "@/components/FinalOCR";               // 图片OCR识别组件 (智能选择最佳方案)
import { useChatManager } from "@/hooks/useChatManager"; // 对话管理 Hook

// 检索文档接口定义：RAG 检索到的知识库文档结构
interface RetrievedDoc {
  source: string; // 文档来源/文件名
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
    sessions, // 所有对话列表
    currentChatId, // 当前对话 ID
    currentChat, // 当前对话对象
    currentMessages, // 当前对话的消息列表
    isLoaded, // 是否已加载完成

    editingChatId, // 正在编辑的对话 ID
    editName, // 编辑中的名称
    setEditName, // 设置编辑名称

    createNewChat, // 创建新对话
    switchToChat, // 切换对话
    updateMessages, // 更新消息
    deleteChat, // 删除对话
    startEditing, // 开始编辑名称
    saveChatName, // 保存编辑的名称
    cancelEditing, // 取消编辑
    updateChatRag, // 更新 RAG 设置
    exportChat, // 导出对话
  } = useChatManager();

  // ==================== 本地状态管理 ====================
  const [input, setInput] = useState(""); // 用户输入框内容
  const [loading, setLoading] = useState(false); // 是否正在等待 AI 响应
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null); // 已复制消息的索引
  const [retrievedDocs, setRetrievedDocs] = useState<RetrievedDoc[]>([]); // RAG 检索到的文档
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true); // 左侧对话列表展开状态
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true); // 右侧知识库展开状态
  const [extractedText, setExtractedText] = useState(""); // 从图片中提取的文字
  const [showOCR, setShowOCR] = useState(false); // 是否显示OCR组件

  // 检测是否为移动设备
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
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
  const messagesEndRef = useRef<HTMLDivElement>(null); // 指向消息列表底部的引用
  const streamControllerRef = useRef<AbortController | null>(null); // 控制 SSE 流中断
  const inputRef = useRef<HTMLInputElement>(null); // 输入框 DOM 引用
  const leftSidebarRef = useRef<HTMLDivElement>(null); // 左侧边栏引用
  const rightSidebarRef = useRef<HTMLDivElement>(null); // 右侧边栏引用

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
      if (
        leftSidebarOpen &&
        window.innerWidth < 1024 &&
        leftSidebarRef.current &&
        !leftSidebarRef.current.contains(target)
      ) {
        setLeftSidebarOpen(false);
      }
      // 右侧边栏
      if (
        rightSidebarOpen &&
        window.innerWidth < 1024 &&
        rightSidebarRef.current &&
        !rightSidebarRef.current.contains(target)
      ) {
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
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Stream error:", error);
        const errorMessage = `❌ 请求失败：${(error as Error).message}`;
        const updatedMessages = [
          ...newMessages,
          {
            role: "assistant" as const,
            content: errorMessage,
            timestamp: Date.now(),
          },
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

  // ==================== OCR相关函数 ====================
  const handleOCRComplete = (result: any) => {
    console.log('OCR识别完成:', result);
    // 可以在这里添加OCR完成后的额外处理逻辑
  };

  const handleTextExtracted = (text: string) => {
    setExtractedText(text);
    // 将识别的文字添加到输入框中，如果输入框为空的话
    if (!input.trim()) {
      setInput(text);
    } else {
      // 如果输入框已有内容，将识别的文字追加到后面
      setInput(prev => prev + '\n\n从图片中识别的文字：\n' + text);
    }
    setShowOCR(false);
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
        <ChatSidebar
          sessions={sessions}
          currentChatId={currentChatId}
          editingChatId={editingChatId}
          editName={editName}
          onChatSelect={switchToChat}
          onNewChat={handleNewChat}
          onStartEditing={startEditing}
          onSaveName={saveChatName}
          onCancelEditing={cancelEditing}
          onEditNameChange={setEditName}
          onDeleteChat={deleteChat}
          onToggleSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
          isOpen={leftSidebarOpen}
          sidebarRef={leftSidebarRef}
        />

        {/* 中间内容区域 */}
        <div className="flex-1 flex flex-col min-w-0 mx-4 sm:mx-8 lg:mx-0">
          {/* 头部区域 */}
          <ChatHeader
            onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
            onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
            onToggleRag={handleToggleRag}
            onExport={handleExport}
            useRag={useRag}
            currentMessagesLength={currentMessages.length}
          />

          {/* 消息列表区域 */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 min-h-full">
              {/* 条件渲染：无消息时显示欢迎界面 */}
              {currentMessages.length === 0 ? (
                <WelcomeScreen
                  presetQuestions={PRESET_QUESTIONS}
                  onQuestionClick={handlePresetQuestion}
                />
              ) : (
                /* 有条件渲染：有消息时遍历显示 */
                currentMessages.map((msg, index) => {
                  const isLastAssistantMsg =
                    msg.role === "assistant" &&
                    index === currentMessages.length - 1;
                  const hasSources =
                    isLastAssistantMsg &&
                    retrievedDocs.length > 0 &&
                    retrievedDocs.some((doc) => doc.source && doc.content);

                  return (
                    <MessageItem
                      key={index}
                      message={msg}
                      index={index}
                      isLastAssistantMessage={isLastAssistantMsg}
                      retrievedDocs={retrievedDocs}
                      copiedIndex={copiedIndex}
                      onCopy={handleCopy}
                      formatTime={formatTime}
                    />
                  );
                })
              )}

              {/* 加载中指示器 */}
              {loading && <TypingIndicator />}

              {/* 滚动锚点 */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 输入区域 */}
          <div className="relative z-20 bg-black/20 backdrop-blur-xl border-t border-white/10 p-4">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              {/* OCR组件 */}
              {showOCR && (
                <div className="mb-4">
                  <ImageOCR
                    onOCRComplete={handleOCRComplete}
                    onTextExtracted={handleTextExtracted}
                  />
                </div>
              )}

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
                {/* OCR上传按钮 */}
                <button
                  type="button"
                  onClick={() => setShowOCR(!showOCR)}
                  className="p-2 sm:p-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 rounded-xl transition-all flex-shrink-0"
                  title="上传图片识别文字"
                >
                  <FileImage className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                </button>
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
                {extractedText && " • 📷 已识别图片文字"}
              </p>
            </form>
          </div>
        </div>

        {/* 右侧边栏：知识库 */}
        <aside
          ref={rightSidebarRef}
          className={`fixed lg:static inset-y-0 right-0 w-80 max-w-[70vw] sm:max-w-[50vw] lg:max-w-none bg-black/60 backdrop-blur-xl border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
            rightSidebarOpen
              ? "translate-x-0"
              : "translate-x-full lg:translate-x-0"
          } ${rightSidebarOpen ? "lg:w-80" : "lg:w-0 lg:overflow-hidden"}`}
        >
          <KnowledgeBase onClose={() => setRightSidebarOpen(false)} />
        </aside>

        {/* 遮罩层（仅移动端展开侧边栏时显示） */}
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
