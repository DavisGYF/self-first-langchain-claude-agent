'use client';

import { useState } from 'react';
import {
  MessageSquare, // 消息图标，用于表示对话
  Plus,          // 加号图标，用于新建对话
  Edit2,         // 编辑图标，用于重命名对话
  Trash2,        // 删除图标，用于删除对话
  X,             // 关闭图标，用于关闭侧边栏
} from 'lucide-react';
import { ChatSession } from '@/hooks/useChatManager';

// 格式化日期显示：将时间戳转换为易读的相对时间
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "今天";      // 当天消息显示"今天"
  if (days === 1) return "昨天";     // 昨天消息显示"昨天"
  if (days < 7) return `${days}天前`; // 7天内显示具体天数
  return date.toLocaleDateString("zh-CN"); // 超过7天显示具体日期
}

interface ChatSidebarProps {
  // 数据相关属性
  sessions: ChatSession[];           // 所有对话会话的列表
  currentChatId: string | null;      // 当前选中的对话ID
  editingChatId: string | null;      // 正在编辑的对话ID
  editName: string;                  // 编辑中的对话名称

  // 用户交互回调函数
  onChatSelect: (chatId: string) => void;                              // 选择对话时的回调
  onNewChat: () => void;                                               // 创建新对话的回调
  onStartEditing: (chatId: string, currentName: string) => void;      // 开始编辑对话名称
  onSaveName: () => void;                                              // 保存编辑的名称
  onCancelEditing: () => void;                                        // 取消编辑
  onEditNameChange: (name: string) => void;                           // 编辑名称时的实时更新
  onDeleteChat: (chatId: string) => void;                             // 删除对话

  // UI控制属性
  onToggleSidebar: () => void;                                        // 切换侧边栏显示状态
  isOpen: boolean;                                                     // 侧边栏是否打开
  sidebarRef: React.RefObject<HTMLDivElement | null>;                        // 侧边栏DOM引用
}

export default function ChatSidebar({
  sessions,
  currentChatId,
  editingChatId,
  editName,
  onChatSelect,
  onNewChat,
  onStartEditing,
  onSaveName,
  onCancelEditing,
  onEditNameChange,
  onDeleteChat,
  onToggleSidebar,
  isOpen,
  sidebarRef,
}: ChatSidebarProps) {
  // 处理编辑输入框的键盘事件：Enter保存，Esc取消
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSaveName();      // 回车键：保存编辑
    } else if (e.key === "Escape") {
      onCancelEditing(); // ESC键：取消编辑
    }
  };

  return (
    // 侧边栏容器：响应式设计，移动端fixed，桌面端static
    <aside
      ref={sidebarRef} // 用于点击外部关闭功能的DOM引用
      className={`fixed lg:static inset-y-0 left-0 w-72 bg-black/60 backdrop-blur-xl border-r border-white/10 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen
          ? "translate-x-0"                    // 打开状态：完全显示
          : "-translate-x-full lg:translate-x-0" // 关闭状态：移动端隐藏，桌面端复位
      } ${isOpen ? "lg:w-72" : "lg:w-0 lg:overflow-hidden"}`} // 桌面端宽度控制
    >
      {/* 侧边栏头部：标题和关闭按钮 */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
        {/* 标题区域：显示侧边栏标题和图标 */}
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          对话列表
        </h2>

        {/* 关闭按钮：点击切换侧边栏显示状态 */}
        <button
          onClick={onToggleSidebar}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* 对话列表容器：flex-1占据剩余空间，可滚动 */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 min-h-0">
        {/* 空状态：当没有对话时显示提示信息 */}
        {sessions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">暂无对话</div>
        ) : (
          // 对话列表：遍历显示所有对话
          sessions.map((chat) => (
            <div
              key={chat.id}
              className={`group relative rounded-lg transition-all ${
                chat.id === currentChatId
                  ? "bg-white/10 border border-indigo-500/50"  // 当前选中：突出显示
                  : "hover:bg-white/5 border border-transparent" // 悬停效果
              }`}
            >
              {/* 对话项主体：可点击选择对话 */}
              <div
                onClick={() => onChatSelect(chat.id)}
                className="p-3 cursor-pointer"
              >
                {/* 编辑模式：显示输入框供用户修改对话名称 */}
                {editingChatId === chat.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    onBlur={onSaveName}  // 失去焦点时自动保存
                    onKeyDown={handleEditKeyDown} // 键盘快捷键支持
                    onClick={(e) => e.stopPropagation()} // 阻止触发选择对话
                    className="w-full bg-black/50 text-white text-sm px-2 py-1 rounded border border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  // 正常显示模式：显示对话信息和元数据
                  <>
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {chat.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {chat.messages.length} 条消息 ·{" "}
                          {formatDate(chat.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 操作按钮区域：重命名和删除按钮 */}
              {editingChatId !== chat.id && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* 重命名按钮：点击开始编辑对话名称 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEditing(chat.id, chat.name);
                    }}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title="重命名"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {/* 删除按钮：删除当前对话 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
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

      {/* 侧边栏底部：新建对话按钮和统计信息 */}
      <div className="p-4 border-t border-white/10 bg-black/20 flex-shrink-0">
        {/* 新建对话按钮：渐变背景，吸引用户注意 */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          新建对话
        </button>

        {/* 统计信息：显示对话数量和存储位置 */}
        <p className="text-xs text-gray-500 text-center mt-2">
          共 {sessions.length} 个对话 · 本地存储
        </p>
      </div>
    </aside>
  );
}