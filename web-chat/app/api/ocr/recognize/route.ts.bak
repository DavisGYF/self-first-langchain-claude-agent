/**
 * OCR文字识别API路由 - 处理图片中的文字识别
 *
 * 功能特性：
 * - 接收上传的图片文件
 * - 使用Tesseract.js进行OCR识别
 * - 支持多语言识别
 * - 返回结构化的识别结果
 *
 * API端点：POST /api/ocr/recognize
 * 请求格式：multipart/form-data
 * 响应格式：JSON
 */

import { NextRequest } from 'next/server';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * OCR识别结果的数据结构
 * 定义API返回的数据格式
 */
interface OCRResponse {
  success: boolean;           // 识别是否成功
  text: string;              // 识别出的完整文本
  confidence: number;        // 整体置信度 (0-100)
  blocks: Array<{            // 文字块详细信息
    text: string;            // 块内文字内容
    confidence: number;      // 块置信度
    bbox: {                  // 边界框坐标
      x: number;             // 左上角X坐标
      y: number;             // 左上角Y坐标
      width: number;         // 宽度
      height: number;        // 高度
    };
  }>;
  language: string;          // 使用的识别语言
  processingTime: number;    // 处理耗时(毫秒)
  error?: string;            // 错误信息（失败时）
}

/**
 * 支持的OCR语言列表
 * 可以根据需要扩展更多语言
 */
const SUPPORTED_LANGUAGES = {
  auto: 'eng+chi_sim+chi_tra+jpn+kor',     // 自动检测（中英文日韩）
  eng: 'eng',                              // 英文
  chi_sim: 'chi_sim',                      // 简体中文
  chi_tra: 'chi_tra',                      // 繁体中文
  jpn: 'jpn',                              // 日文
  kor: 'kor',                              // 韩文
  eng_chi: 'eng+chi_sim',                  // 英文+简体中文
};

/**
 * 保存上传文件到临时目录
 * 将上传的图片文件保存到服务器临时目录供OCR处理
 *
 * @param file - 上传的文件对象
 * @returns Promise解析为临时文件路径
 */
async function saveUploadedFile(file: File): Promise<string> {
  // 创建临时文件名（使用时间戳确保唯一性）
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const tempFileName = `ocr_${timestamp}.${extension}`;

  // 临时文件保存路径（使用系统临时目录）
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, tempFileName);

  try {
    // 将文件内容读取为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 写入到临时文件
    await fs.promises.writeFile(tempFilePath, buffer);

    return tempFilePath;
  } catch (error) {
    // 如果保存失败，清理临时文件并抛出错误
    if (fs.existsSync(tempFilePath)) {
      await fs.promises.unlink(tempFilePath);
    }
    throw new Error(`文件保存失败：${error}`);
  }
}

/**
 * 执行OCR文字识别
 * 使用Tesseract.js对图片进行文字识别
 *
 * @param imagePath - 图片文件路径
 * @param language - 识别语言代码
 * @returns Promise解析为OCR识别结果
 */
async function performOCR(imagePath: string, language: string): Promise<OCRResponse> {
  const startTime = Date.now(); // 记录开始时间

  try {
    // 根据语言参数选择识别语言
    const langCode = SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES] || SUPPORTED_LANGUAGES.auto;

    console.log(`🔍 开始OCR识别: ${imagePath}, 语言: ${langCode}`);

    // 使用Tesseract.recognize进行OCR识别 (v7 API)
    const result = await Tesseract.recognize(imagePath, langCode, {
      logger: (m) => console.log(`📝 OCR进度:`, m)
    });

    console.log(`✅ OCR识别完成，文本长度: ${result.data.text?.length || 0}`);

    // 计算处理耗时
    const processingTime = Date.now() - startTime;

    // 处理识别结果 - 简化处理逻辑
    let processedBlocks: any[] = [];
    let confidence = 0;
    let recognizedText = '';

    // 检查Tesseract.js v7的数据结构
    if (result && result.data) {
      recognizedText = result.data.text || '';
      confidence = typeof result.data.confidence === 'number' ? result.data.confidence : 90;

      // 尝试获取words数据（如果存在）
      if (result.data && Array.isArray((result.data as any).words)) {
        processedBlocks = (result.data as any).words.map((word: any) => ({
          text: word.text || '',
          confidence: word.confidence || confidence,
          bbox: word.bbox || { x: 0, y: 0, width: 0, height: 0 },
        }));
      } else {
        // 创建单个文本块
        processedBlocks = [{
          text: recognizedText,
          confidence: confidence,
          bbox: { x: 0, y: 0, width: 0, height: 0 },
        }];
      }
    }

    // 构建完整的OCR响应
    const ocrResponse: OCRResponse = {
      success: true,
      text: recognizedText.trim(),
      confidence,
      blocks: processedBlocks,
      language: langCode,
      processingTime,
    };

    return ocrResponse;

  } catch (error) {
    // 捕获OCR处理错误
    throw new Error(`OCR识别失败：${error}`);
  }
}

/**
 * POST请求处理函数
 * 主要的API入口点，处理OCR识别请求
 *
 * @param request - Next.js请求对象
 * @returns NextResponse包含OCR识别结果
 */
export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  // 添加CORS头部
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 处理OPTIONS预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // 解析请求数据
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const language = formData.get('language') as string || 'auto';

    // 验证文件是否存在
    if (!imageFile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '未找到上传的图片文件',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // 验证文件类型
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(imageFile.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `不支持的文件类型：${imageFile.type}。支持的类型：${validTypes.join(', ')}`,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // 验证文件大小 (最大10MB)
    const maxSize = 10 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `文件大小超过限制：${(imageFile.size / (1024 * 1024)).toFixed(2)}MB > 10MB`,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // 保存上传的文件到临时目录
    tempFilePath = await saveUploadedFile(imageFile);

    // 执行OCR识别（带超时控制）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OCR处理超时，请重试')), 30000); // 30秒超时
    });

    const ocrResult = await Promise.race([
      performOCR(tempFilePath, language),
      timeoutPromise
    ]);

    // 返回成功的响应
    return new Response(JSON.stringify(ocrResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    // 处理所有可能的错误
    console.error('OCR API错误:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'OCR处理失败',
        text: '',
        confidence: 0,
        blocks: [],
        language: 'unknown',
        processingTime: 0,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } finally {
    // 清理临时文件
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('临时文件清理失败:', unlinkError);
      }
    }
  }
}
