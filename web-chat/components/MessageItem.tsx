'use client';

import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, Database } from 'lucide-react';
import { Message } from '@/hooks/useChatManager';

interface RetrievedDoc {
  source: string;
  content: string;
}

interface MessageItemProps {
  message: Message;
  index: number;
  isLastAssistantMessage: boolean;
  retrievedDocs: RetrievedDoc[];
  copiedIndex: number | null;
  onCopy: (content: string, index: number) => void;
  formatTime: (timestamp: number) => string;
}

export default function MessageItem({
  message,
  index,
  isLastAssistantMessage,
  retrievedDocs,
  copiedIndex,
  onCopy,
  formatTime,
}: MessageItemProps) {
  const hasSources =
    isLastAssistantMessage &&
    retrievedDocs.length > 0 &&
    retrievedDocs.some((doc) => doc.source && doc.content);

  return (
    // 消息容器：用户消息右对齐，AI 消息左对齐
    <div
      className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
    >
      {/* AI 头像：仅 AI 消息显示 */}
      {message.role === "assistant" && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* 消息内容容器 */}
      <div
        className={`max-w-[80%] ${message.role === "user" ? "items-end" : "items-start"}`}
      >
        {/* 消息气泡：用户和 AI 不同样式 */}
        <div
          className={`rounded-2xl px-5 py-3 ${
            message.role === "user"
              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
              : "bg-white/10 backdrop-blur-sm text-gray-100 border border-white/10"
          }`}
        >
          {message.role === "user" ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert max-w-none text-sm">
              <ReactMarkdown>{message.content}</ReactMarkdown>
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
          className={`flex items-center gap-2 mt-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <span className="text-xs text-gray-500">
            {formatTime(message.timestamp)}
          </span>
          {message.role === "assistant" && (
            <button
              onClick={() => onCopy(message.content, index)}
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
      {message.role === "user" && (
        <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-300" />
        </div>
      )}
    </div>
  );
}