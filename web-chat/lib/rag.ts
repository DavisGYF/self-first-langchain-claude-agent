import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import type { ChromaClient, Collection } from 'chromadb';

// ChromaDB 客户端单例
let chromaClient: ChromaClient | null = null;

async function getChromaClient(): Promise<ChromaClient> {
  if (!chromaClient) {
    const { ChromaClient: ChromaClientClass } = await import('chromadb');
    chromaClient = new ChromaClientClass({
      path: './chroma_db',
    });
  }
  return chromaClient;
}

// 向量存储配置
const COLLECTION_NAME = 'knowledge_base';

/**
 * 获取或创建向量存储
 */
export async function getVectorStore() {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL;

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: apiKey,
    configuration: baseUrl ? { baseURL: baseUrl } : undefined,
  });

  const client = await getChromaClient();

  let collection: Collection;
  const existingCollections = await client.listCollections();

  if (existingCollections.some(c => c.name === COLLECTION_NAME)) {
    collection = await client.getCollection({ name: COLLECTION_NAME });
  } else {
    collection = await client.createCollection({
      name: COLLECTION_NAME,
      metadata: { description: 'RAG Knowledge Base' },
    });
  }

  return Chroma.fromExistingCollection(embeddings, {
    collectionName: COLLECTION_NAME,
    index: client,
  });
}

/**
 * 文本分割器配置
 */
export function getTextSplitter() {
  return new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '.', '。', '，', ',', ' ', ''],
  });
}

/**
 * 解析 PDF 文件内容（使用 pdf-parse）
 */
export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse(buffer);
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    console.error('PDF 解析失败:', error);
    throw new Error('PDF 解析失败，请确保已安装 pdf-parse 依赖');
  }
}

/**
 * 解析文本文件内容
 */
export async function parseText(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8');
}

/**
 * 解析 Markdown 文件内容
 */
export async function parseMarkdown(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8');
}

/**
 * 提取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

/**
 * 根据文件类型解析内容
 */
export async function parseFileContent(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = getFileExtension(filename);

  switch (ext) {
    case 'pdf':
      return parsePDF(buffer);
    case 'md':
    case 'markdown':
      return parseMarkdown(buffer);
    case 'txt':
    default:
      return parseText(buffer);
  }
}

/**
 * 上传文档到知识库
 */
export async function uploadDocument(
  filename: string,
  content: string
): Promise<{ success: boolean; chunks: number; message: string }> {
  try {
    const vectorStore = await getVectorStore();
    const splitter = getTextSplitter();

    // 创建原始文档
    const doc = new Document({
      pageContent: content,
      metadata: {
        source: filename,
        uploadedAt: new Date().toISOString(),
      },
    });

    // 分割文本
    const docs = await splitter.splitDocuments([doc]);

    // 添加到向量存储
    await vectorStore.addDocuments(docs, { ids: docs.map((_, i) => `${filename}-${i}`) });

    return {
      success: true,
      chunks: docs.length,
      message: `成功添加 ${docs.length} 个文本块`,
    };
  } catch (error) {
    console.error('上传文档失败:', error);
    return {
      success: false,
      chunks: 0,
      message: `上传失败：${(error as Error).message}`,
    };
  }
}

/**
 * 检索相关文档
 */
export async function retrieveDocuments(
  query: string,
  topK: number = 3
): Promise<Document[]> {
  try {
    const vectorStore = await getVectorStore();
    const results = await vectorStore.similaritySearch(query, topK);
    return results;
  } catch (error) {
    console.error('检索失败:', error);
    return [];
  }
}

/**
 * 格式化检索结果为上下文字符串
 */
export function formatContext(documents: Document[]): string {
  if (documents.length === 0) {
    return '';
  }

  return documents
    .map((doc, index) => {
      return `[来源：${doc.metadata.source}]
${doc.pageContent}`;
    })
    .join('\n\n---\n\n');
}

/**
 * 删除指定文档
 */
export async function deleteDocument(filename: string): Promise<boolean> {
  try {
    const vectorStore = await getVectorStore();
    const client = await getChromaClient();
    const collection = await client.getCollection({ name: COLLECTION_NAME });

    // 查找所有属于该文件的 IDs
    const allData = await collection.get({ include: ['metadatas'] });
    const idsToDelete = allData.ids?.filter(
      (_, i) => allData.metadatas?.[i]?.['source'] === filename
    ) || [];

    if (idsToDelete.length > 0) {
      await collection.delete({ ids: idsToDelete });
    }

    return true;
  } catch (error) {
    console.error('删除文档失败:', error);
    return false;
  }
}

/**
 * 获取知识库中的所有文档列表
 */
export async function getDocumentList(): Promise<
  { filename: string; chunks: number; uploadedAt: string }[]
> {
  try {
    const client = await getChromaClient();
    const collection = await client.getCollection({ name: COLLECTION_NAME });
    const allData = await collection.get({ include: ['metadatas'] });

    // 按文件名分组统计
    const docMap = new Map<string, { chunks: number; uploadedAt: string }>();

    allData.metadatas?.forEach((meta) => {
      const source = meta?.['source'] as string;
      const uploadedAt = meta?.['uploadedAt'] as string;

      if (source) {
        const existing = docMap.get(source) || { chunks: 0, uploadedAt: '' };
        docMap.set(source, {
          chunks: existing.chunks + 1,
          uploadedAt: uploadedAt || existing.uploadedAt,
        });
      }
    });

    return Array.from(docMap.entries()).map(([filename, data]) => ({
      filename,
      chunks: data.chunks,
      uploadedAt: data.uploadedAt,
    }));
  } catch (error) {
    console.error('获取文档列表失败:', error);
    return [];
  }
}
