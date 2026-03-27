import { NextRequest } from 'next/server';
import { parseFileContent, uploadDocument } from '@/lib/rag';

// 限制上传文件大小为 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: '未找到文件' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: '文件大小不能超过 10MB' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查文件类型
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'text/x-markdown'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|md|markdown)$/i)) {
      return new Response(
        JSON.stringify({ error: '仅支持 PDF、TXT 和 Markdown 文件' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 解析文件内容
    const content = await parseFileContent(buffer, file.name);

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: '文件内容为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 上传到知识库
    const result = await uploadDocument(file.name, content);

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          filename: file.name,
          chunks: result.chunks,
          message: result.message,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: result.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('上传失败:', error);
    return new Response(
      JSON.stringify({ error: '上传失败：' + (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
