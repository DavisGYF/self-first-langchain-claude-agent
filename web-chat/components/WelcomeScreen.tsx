'use client';

import { Bot, Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  presetQuestions: string[];
  onQuestionClick: (question: string) => void;
}

export default function WelcomeScreen({ presetQuestions, onQuestionClick }: WelcomeScreenProps) {
  return (
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
          {presetQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => onQuestionClick(question)}
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
  );
}