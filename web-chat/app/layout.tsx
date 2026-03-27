import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 智能助手 - 基于 DeepSeek LLM",
  description: "一个现代化的 AI 聊天界面，支持流式响应和对话历史。使用 Next.js 14、TypeScript、Tailwind CSS 和 LangChain 构建。",
  keywords: ["AI", "Chatbot", "Next.js", "DeepSeek", "LangChain", "React"],
  authors: [{ name: "Your Name" }],
  openGraph: {
    title: "AI 智能助手",
    description: "一个现代化的 AI 聊天界面",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-900">
        {children}
      </body>
    </html>
  );
}
