import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: '消息不能为空' },
        { status: 400 }
      );
    }

    // 获取环境变量
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL;

    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 API Key' },
        { status: 500 }
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

    // 调用模型
    const response = await model.invoke(message);

    return NextResponse.json({
      reply: response.content,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: '服务错误：' + (error as Error).message },
      { status: 500 }
    );
  }
}
