import { NextRequest } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { retrieveDocuments, formatContext } from '@/lib/rag';

// 禁用缓存以确保每次请求都是动态的
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const { message, history = [], useRag = true } = await request.json();

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

    // RAG 检索相关文档
    let context = '';
    let retrievedDocs: any[] = [];

    if (useRag) {
      try {
        const documents = await retrieveDocuments(message, 3);
        if (documents.length > 0) {
          context = formatContext(documents);
          retrievedDocs = documents.map((doc: any) => ({
            source: doc.metadata.source,
            content: doc.pageContent.substring(0, 200) + '...',
          }));
        }
      } catch (error) {
        console.warn('RAG 检索失败，使用普通模式:', error);
      }
    }

    // 创建 ChatOpenAI 实例
    const model = new ChatOpenAI({
      modelName: 'deepseek-chat',
      apiKey: apiKey,
      temperature: 0.7,
    });

    // 构建系统提示词（如果使用了 RAG）
    const systemPrompt = context
      ? `以下是从知识库中检索到的相关信息，请基于这些信息回答用户的问题。如果信息不足以回答问题，请说明需要更多信息。

【相关知识】
${context}

请根据以上信息回答用户的问题。`
      : '';

    // 构建消息历史
    const messages: Array<HumanMessage | AIMessage> = [];

    // 添加系统提示词
    if (systemPrompt) {
      messages.push(new HumanMessage(systemPrompt));
    }

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
    const finalMessage = context
      ? `${message}\n\n（请基于上述知识库内容回答）`
      : message;
    messages.push(new HumanMessage(finalMessage));

    // 使用流式调用 - 需要 await stream()
    const stream = await model.stream(messages);

    // 在流式响应中先发送检索到的文档信息
    let hasSentMeta = false;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // 先发送元数据（检索到的文档）
          if (!hasSentMeta && (retrievedDocs.length > 0 || useRag)) {
            const meta = JSON.stringify({
              metadata: {
                retrievedDocs,
                usedRag: useRag && retrievedDocs.length > 0,
              },
            });
            controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
            hasSentMeta = true;
          }

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
