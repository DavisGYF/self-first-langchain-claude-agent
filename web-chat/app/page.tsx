"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Plus,
  Copy,
  Check,
  Download,
  Sparkles,
  Bot,
  User,
  Database,
  BrainCircuit,
  Square,
} from "lucide-react";
import KnowledgeBase from "@/components/KnowledgeBase";
import TypingIndicator from "@/components/TypingIndicator";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface RetrievedDoc {
  source: string;
  content: string;
}

const PRESET_QUESTIONS = [
  "RAG 功能是如何工作的？",
  "如何上传文档到知识库？",
  "解释一下 JavaScript 的事件循环机制",
  "React Hooks 的原理是什么？",
];

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [retrievedDocs, setRetrievedDocs] = useState<RetrievedDoc[]>([]);
  const [showRagSources, setShowRagSources] = useState<number | null>(null);
  const [useRag, setUseRag] = useState(true); // RAG 开关
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
      }
    };
  }, []);

  // 快捷键支持
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
    }

    const userMessage = input.trim();
    const timestamp = Date.now();
    setInput("");

    const newMessages = [
      ...messages,
      { role: "user" as const, content: userMessage, timestamp },
    ];
    setMessages(newMessages);
    setLoading(true);

    streamControllerRef.current = new AbortController();

    const messagesWithPlaceholder = [
      ...newMessages,
      { role: "assistant" as const, content: "", timestamp: Date.now() },
    ];
    setMessages(messagesWithPlaceholder);

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
                // 只有当真正使用了 RAG 时才设置检索到的文档
                if (parsed.metadata.usedRag === true) {
                  setRetrievedDocs(parsed.metadata.retrievedDocs || []);
                } else {
                  // 如果没有使用 RAG，确保清空检索结果
                  setRetrievedDocs([]);
                }
                docsReceived = true;
              }

              if (parsed.content) {
                accumulatedContent += parsed.content;
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = {
                    ...newMsgs[newMsgs.length - 1],
                    content: accumulatedContent,
                  };
                  return newMsgs;
                });
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Stream error:", error);
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === "assistant" && !lastMsg.content.trim()) {
            newMessages[newMessages.length - 1] = {
              ...lastMsg,
              content: `❌ 请求失败：${(error as Error).message}`,
            };
          } else {
            newMessages.push({
              role: "assistant",
              content: `❌ 请求失败：${(error as Error).message}`,
              timestamp: Date.now(),
            });
          }
          return newMessages;
        });
      }
    } finally {
      setLoading(false);
      streamControllerRef.current = null;
    }
  };

  const handleNewChat = () => {
    if (
      messages.length === 0 ||
      confirm("确定要开始新对话吗？当前对话记录将被清空。")
    ) {
      setMessages([]);
      setRetrievedDocs([]);
      inputRef.current?.focus();
    }
  };

  const handleStopGeneration = () => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleCopy = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExport = () => {
    const exportData = messages.map((msg) => ({
      role: msg.role === "user" ? "用户" : "AI",
      content: msg.content,
      time: new Date(msg.timestamp).toLocaleString("zh-CN"),
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `聊天记录-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePresetQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header
        className="relative z-20 bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4"
        style={{ marginRight: "20rem" }}
      >
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI 智能助手</h1>
              <p className="text-xs text-gray-400">基于 DeepSeek LLM</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* RAG 开关 */}
            <button
              onClick={() => setUseRag(!useRag)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                useRag
                  ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/50"
                  : "bg-white/5 text-gray-400 border border-white/10"
              }`}
              title={
                useRag ? "RAG 已启用 - 基于知识库回答" : "RAG 已禁用 - 普通模式"
              }
            >
              <BrainCircuit className="w-4 h-4" />
              {useRag ? "RAG ON" : "RAG OFF"}
            </button>

            <button
              onClick={handleExport}
              disabled={messages.length === 0}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
              title="导出聊天记录"
            >
              <Download className="w-5 h-5 text-gray-400 group-hover:text-white" />
            </button>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              新对话
            </button>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div
        className="relative z-20 flex-1 overflow-y-auto"
        style={{ marginRight: "20rem" }}
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/30">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                你好，我是你的 AI 助手
              </h2>
              <p className="text-gray-400 mb-8 text-center max-w-md">
                我可以帮你解答问题、编写代码、创作内容等。随时问我任何问题！
              </p>

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
            messages.map((msg, index) => {
              const isLastAssistantMsg =
                msg.role === "assistant" && index === messages.length - 1;
              const hasSources =
                isLastAssistantMsg &&
                retrievedDocs.length > 0 &&
                retrievedDocs.some((doc) => doc.source && doc.content);

              return (
                <div
                  key={index}
                  className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
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

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "assistant" && (
              <TypingIndicator />
            )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div
        className="relative z-20 bg-black/20 backdrop-blur-xl border-t border-white/10 p-4"
        style={{ marginRight: "20rem" }}
      >
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-center bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的问题... (Enter 发送，Shift+Enter 换行)"
              disabled={loading}
              className="flex-1 bg-transparent text-white placeholder-gray-500 px-4 py-2 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all disabled:grayscale"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
            {loading && (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl transition-all"
                title="停止生成"
              >
                <Square className="w-5 h-5 text-red-400" />
              </button>
            )}
          </div>
          <p className="text-center text-xs text-gray-500 mt-3">
            AI 生成的内容可能有误，请自行核实 •{" "}
            {useRag ? "🧠 RAG 知识库已启用" : "💬 普通对话模式"}
          </p>
        </form>
      </div>

      {/* Knowledge Base Sidebar */}
      <KnowledgeBase />
    </div>
  );
}
