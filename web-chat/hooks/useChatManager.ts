// 对话管理 Hook：处理对话的创建、保存、加载、切换和删除
import { useState, useEffect } from "react";

// 对话接口定义
export interface ChatSession {
  id: string;              // 唯一标识符
  name: string;            // 对话名称
  messages: Message[];     // 消息列表
  createdAt: number;       // 创建时间戳
  updatedAt: number;       // 最后更新时间戳
  useRag: boolean;         // RAG 设置
}

// 消息接口定义
export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const STORAGE_KEY = "chat_sessions";
const MAX_SESSIONS = 50; // 最多保存 50 个对话

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 从 localStorage 加载对话列表
 */
function loadSessionsFromStorage(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("加载对话列表失败:", error);
    return [];
  }
}

/**
 * 保存对话列表到 localStorage
 */
function saveSessionsToStorage(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("保存对话列表失败:", error);
  }
}

/**
 * 根据消息生成对话名称
 */
function generateChatName(messages: Message[]): string {
  if (messages.length === 0) return "新对话";

  // 使用第一条用户消息作为对话名称（最多 20 个字）
  const firstUserMessage = messages.find(m => m.role === "user");
  if (firstUserMessage) {
    const name = firstUserMessage.content.slice(0, 30);
    return name + (firstUserMessage.content.length > 30 ? "..." : "");
  }

  return "新对话";
}

/**
 * 对话管理 Hook
 */
export function useChatManager() {
  // 状态管理
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 编辑状态
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // 初始化：从 localStorage 加载对话列表
  useEffect(() => {
    const loadedSessions = loadSessionsFromStorage();
    setSessions(loadedSessions);

    // 如果有对话，加载最近的一个；否则创建新对话
    if (loadedSessions.length > 0) {
      const latestSession = loadedSessions.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setCurrentChatId(latestSession.id);
    } else {
      createNewChat();
    }
    setIsLoaded(true);
  }, []);

  // 当前对话
  const currentChat = sessions.find(s => s.id === currentChatId) || null;
  const currentMessages = currentChat?.messages || [];

  // 保存到 localStorage（当 sessions 变化时）
  useEffect(() => {
    if (isLoaded) {
      saveSessionsToStorage(sessions);
    }
  }, [sessions, isLoaded]);

  /**
   * 创建新对话
   */
  const createNewChat = () => {
    const newSession: ChatSession = {
      id: generateId(),
      name: "新对话",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      useRag: true,
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentChatId(newSession.id);
    setEditingChatId(null);
    return newSession;
  };

  /**
   * 切换到指定对话
   */
  const switchToChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setEditingChatId(null);
  };

  /**
   * 更新当前对话的消息
   */
  const updateMessages = (messages: Message[]) => {
    if (!currentChatId) return;

    setSessions(prev => prev.map(session => {
      if (session.id === currentChatId) {
        // 如果这是第一条消息，生成对话名称
        const name = session.messages.length === 0 && messages.length > 0
          ? generateChatName(messages)
          : session.name;

        return {
          ...session,
          name,
          messages,
          updatedAt: Date.now(),
        };
      }
      return session;
    }));
  };

  /**
   * 删除对话
   */
  const deleteChat = (chatId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== chatId);

      // 如果删除的是当前对话，切换到另一个对话
      if (chatId === currentChatId) {
        if (filtered.length > 0) {
          setCurrentChatId(filtered[0].id);
        } else {
          // 没有对话了，创建一个新的
          const newSession: ChatSession = {
            id: generateId(),
            name: "新对话",
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            useRag: true,
          };
          setCurrentChatId(newSession.id);
          return [newSession];
        }
      }

      return filtered;
    });
  };

  /**
   * 开始编辑对话名称
   */
  const startEditing = (chatId: string, currentName: string) => {
    setEditingChatId(chatId);
    setEditName(currentName);
  };

  /**
   * 保存对话名称
   */
  const saveChatName = () => {
    if (!editingChatId || !editName.trim()) return;

    setSessions(prev => prev.map(session => {
      if (session.id === editingChatId) {
        return {
          ...session,
          name: editName.trim(),
        };
      }
      return session;
    }));

    setEditingChatId(null);
    setEditName("");
  };

  /**
   * 取消编辑
   */
  const cancelEditing = () => {
    setEditingChatId(null);
    setEditName("");
  };

  /**
   * 更新对话的 RAG 设置
   */
  const updateChatRag = (useRag: boolean) => {
    if (!currentChatId) return;

    setSessions(prev => prev.map(session => {
      if (session.id === currentChatId) {
        return {
          ...session,
          useRag,
        };
      }
      return session;
    }));
  };

  /**
   * 导出对话为 JSON
   */
  const exportChat = (chatId?: string) => {
    const targetChat = chatId
      ? sessions.find(s => s.id === chatId)
      : currentChat;

    if (!targetChat) return;

    const exportData = targetChat.messages.map((msg) => ({
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
    a.download = `${targetChat.name}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * 清空所有对话
   */
  const clearAllChats = () => {
    if (window.confirm("确定要删除所有对话记录吗？此操作不可恢复。")) {
      setSessions([]);
      setCurrentChatId(null);
      createNewChat();
    }
  };

  return {
    // 状态
    sessions,
    currentChatId,
    currentChat,
    currentMessages,
    isLoaded,

    // 编辑状态
    editingChatId,
    editName,
    setEditName,

    // 方法
    createNewChat,
    switchToChat,
    updateMessages,
    deleteChat,
    startEditing,
    saveChatName,
    cancelEditing,
    updateChatRag,
    exportChat,
    clearAllChats,
  };
}
