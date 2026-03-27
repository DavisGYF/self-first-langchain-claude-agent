import { NextRequest } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// 禁用缓存以确保每次请求都是动态的
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: '消息不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取环境变量
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: '未配置 API Key' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 设置 OPENAI_API_KEY 供 LangChain 使用
    process.env.OPENAI_API_KEY = apiKey;
    if (baseUrl) {
      process.env.OPENAI_BASE_URL = baseUrl;
    }

    // 创建 ChatOpenAI 实例
    const model = new ChatOpenAI({
      modelName: 'deepseek-chat',
      apiKey: apiKey,
      temperature: 0.7,
    });

    // 构建消息历史
    const messages: Array<HumanMessage | AIMessage> = [];

    // 添加历史消息（限制最多 20 条以节省 token）
    const maxHistory = 20;
    const recentHistory = history.slice(-maxHistory);

    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        messages.push(new HumanMessage(msg.content));
      } else {
        messages.push(new AIMessage(msg.content));
      }
    }

    // 添加当前消息
    messages.push(new HumanMessage(message));

    // 使用流式调用 - 需要 await stream()
    const stream = await model.stream(messages);

    // 创建可读取流
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const data = `data: ${JSON.stringify({ content: chunk.content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          // 发送结束标记
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: '服务错误：' + (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
