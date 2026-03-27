import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import path from 'path';
import fs from 'fs';

// 知识库数据存储路径
const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), 'knowledge_base');

// 确保目录存在
if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
  fs.mkdirSync(KNOWLEDGE_BASE_PATH, { recursive: true });
}

// 简单的本地文档存储（使用关键词匹配）
interface StoredDocument {
  content: string;
  keywords: string[];
  metadata: {
    source: string;
    uploadedAt: string;
  };
}

const COLLECTION_NAME = 'knowledge_base';
let cachedDocs: StoredDocument[] = [];

// 从缓存文件加载文档
function loadCachedDocs(): StoredDocument[] {
  const cachePath = path.join(KNOWLEDGE_BASE_PATH, `${COLLECTION_NAME}.json`);
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

// 保存文档到缓存文件
function saveCachedDocs(docs: StoredDocument[]): void {
  const cachePath = path.join(KNOWLEDGE_BASE_PATH, `${COLLECTION_NAME}.json`);
  fs.writeFileSync(cachePath, JSON.stringify(docs, null, 2));
}

/**
 * 提取中文和英文关键词
 */
function extractKeywords(text: string): string[] {
  const keywords: Set<string> = new Set();

  // 提取英文单词（至少 3 个字母）
  const englishWords = text.match(/\b[a-zA-Z]{3,}\b/g);
  englishWords?.forEach(word => keywords.add(word.toLowerCase()));

  // 提取中文字符作为关键词（每个字作为一个关键词）
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  chineseChars?.forEach(char => keywords.add(char));

  // 提取连续的中文词组（2-4 个字）
  const chinesePhrases = text.match(/[\u4e00-\u9fa5]{2,4}/g);
  chinesePhrases?.forEach(phrase => keywords.add(phrase));

  return Array.from(keywords);
}

/**
 * 计算关键词匹配得分
 */
function calculateMatchScore(docKeywords: string[], queryKeywords: string[]): number {
  let score = 0;
  const docSet = new Set(docKeywords);

  queryKeywords.forEach(keyword => {
    if (docSet.has(keyword)) {
      score++;
    }
  });

  return score / Math.max(queryKeywords.length, 1);
}

/**
 * 检索相关文档（使用关键词匹配）
 */
export async function retrieveDocuments(query: string, topK: number = 3): Promise<Document[]> {
  cachedDocs = loadCachedDocs();

  if (cachedDocs.length === 0) {
    return [];
  }

  const queryKeywords = extractKeywords(query);

  // 计算所有文档的匹配得分
  const scoredDocs = cachedDocs.map((doc) => ({
    ...doc,
    score: calculateMatchScore(doc.keywords, queryKeywords),
  }));

  // 按得分排序并取前 K 个
  scoredDocs.sort((a, b) => b.score - a.score);
  const topDocs = scoredDocs.filter(d => d.score > 0).slice(0, topK);

  return topDocs.map(doc => new Document({
    pageContent: doc.content,
    metadata: doc.metadata,
  }));
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
    const splitter = getTextSplitter();

    // 分割文本
    const docs = await splitter.splitDocuments([
      new Document({
        pageContent: content,
        metadata: {
          source: filename,
          uploadedAt: new Date().toISOString(),
        },
      }),
    ]);

    // 为每个文档块提取关键词
    const newDocs: StoredDocument[] = [];
    for (const doc of docs) {
      const keywords = extractKeywords(doc.pageContent);
      newDocs.push({
        content: doc.pageContent,
        keywords,
        metadata: {
          source: doc.metadata.source as string,
          uploadedAt: doc.metadata.uploadedAt as string,
        },
      });
    }

    // 加载现有文档并添加新文档
    cachedDocs = loadCachedDocs();
    cachedDocs.push(...newDocs);
    saveCachedDocs(cachedDocs);

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
 * 删除指定文档
 */
export async function deleteDocument(filename: string): Promise<boolean> {
  try {
    cachedDocs = loadCachedDocs();
    const filteredDocs = cachedDocs.filter(doc => doc.metadata.source !== filename);
    saveCachedDocs(filteredDocs);
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
    cachedDocs = loadCachedDocs();

    // 按文件名分组统计
    const docMap = new Map<string, { chunks: number; uploadedAt: string }>();

    cachedDocs.forEach((doc) => {
      const source = doc.metadata.source;
      const uploadedAt = doc.metadata.uploadedAt;

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
