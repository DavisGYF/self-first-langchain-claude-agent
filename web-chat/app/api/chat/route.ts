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
    let hasRelevantDocs = false;

    if (useRag) {
      try {
        const documents = await retrieveDocuments(message, 3);
        // 只有检索到相关内容时才使用 RAG
        if (documents.length > 0) {
          context = formatContext(documents);
          retrievedDocs = documents.map((doc: any) => ({
            source: doc.metadata.source,
            content: doc.pageContent.substring(0, 200) + '...',
          }));
          hasRelevantDocs = true;
        } else {
          // 没有检索到相关内容，使用普通模式
          console.log('RAG: 未找到相关内容，使用普通模式');
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

    // 构建系统提示词（只有检索到相关内容时才使用）
    const systemPrompt = hasRelevantDocs
      ? `以下是从知识库中检索到的相关信息，请基于这些信息回答用户的问题。如果信息不足以回答问题，可以结合你的通用知识补充。

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

    // 添加当前消息（不需要额外提示，让大模型自然回答）
    messages.push(new HumanMessage(message));

    // 使用流式调用 - 需要 await stream()
    const stream = await model.stream(messages);

    // 在流式响应中先发送检索到的文档信息
    let hasSentMeta = false;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // 先发送元数据（只有检索到文档时才发送）
          if (!hasSentMeta && retrievedDocs.length > 0) {
            const meta = JSON.stringify({
              metadata: {
                retrievedDocs,
                usedRag: hasRelevantDocs,
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
