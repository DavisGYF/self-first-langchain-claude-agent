/**
 * 聊天头部组件 - 负责显示应用标题和核心功能按钮
 *
 * 功能特性：
 * - 显示应用Logo和标题信息
 * - 提供侧边栏切换控制
 * - RAG功能开关控制
 * - 对话导出功能
 *
 * 设计考虑：
 * - 响应式设计：适配不同屏幕尺寸
 * - 功能聚合：将核心操作集中在头部
 * - 视觉层次：通过间距和大小区分功能重要性
 */
'use client';

import {
  Menu,        // 菜单图标，用于切换侧边栏
  Database,    // 数据库图标，用于知识库功能
  Download,    // 下载图标，用于导出功能
  BrainCircuit,// 大脑图标，用于RAG开关
  Sparkles     // 闪光图标，用于应用Logo
} from 'lucide-react';

interface ChatHeaderProps {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onToggleRag: () => void;
  onExport: () => void;
  useRag: boolean;
  currentMessagesLength: number;
}

export default function ChatHeader({
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onToggleRag,
  onExport,
  useRag,
  currentMessagesLength,
}: ChatHeaderProps) {
  return (
    <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-3 flex-shrink-0">
      {/* 左侧菜单按钮 */}
      <button
        onClick={onToggleLeftSidebar}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
          onClick={onToggleRag}
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
          onClick={onExport}
          disabled={currentMessagesLength === 0}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
          title="导出聊天记录"
        >
          <Download className="w-4 h-4 text-gray-400 group-hover:text-white" />
        </button>

        {/* 右侧菜单按钮 */}
        <button
          onClick={onToggleRightSidebar}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="知识库"
        >
          <Database className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </header>
  );
}