import { NextRequest } from 'next/server';
import { getDocumentList, deleteDocument } from '@/lib/rag';

// GET: 获取知识库文档列表
export async function GET() {
  try {
    const documents = await getDocumentList();

    return new Response(
      JSON.stringify({
        success: true,
        documents,
        total: documents.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取文档列表失败:', error);
    return new Response(
      JSON.stringify({ error: '获取失败：' + (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE: 删除指定文档
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return new Response(
        JSON.stringify({ error: '请指定要删除的文件名' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const success = await deleteDocument(filename);

    if (success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `已成功删除 ${filename}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: '删除失败' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('删除失败:', error);
    return new Response(
      JSON.stringify({ error: '删除失败：' + (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
