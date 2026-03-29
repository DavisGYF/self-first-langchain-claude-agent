/**
 * Tesseract.js OCR识别API路由
 *
 * 功能特性：
 * - 完全免费的OCR识别
 * - 支持中文和英文
 * - 无需网络请求，本地处理
 * - 支持多种图片格式
 *
 * API端点：POST /api/ocr/tesseract
 * 请求格式：multipart/form-data
 * 响应格式：JSON
 */

import { NextRequest } from "next/server";
import Tesseract from "tesseract.js";

/**
 * OCR识别结果的数据结构
 */
interface OCRResponse {
  success: boolean;
  text: string;
  confidence: number;
  blocks: Array<{
    text: string;
    confidence: number;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  language: string;
  processingTime: number;
  error?: string;
}

/**
 * 保存上传文件到临时目录
 */
async function saveUploadedFile(file: File): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "jpg";
  const tempFileName = `ocr_tesseract_${timestamp}.${extension}`;

  // 使用项目临时目录
  const tempDir = "/tmp";
  const tempFilePath = `${tempDir}/${tempFileName}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fs = require("fs");
    await fs.promises.mkdir(tempDir, { recursive: true });
    await fs.promises.writeFile(tempFilePath, buffer);

    return tempFilePath;
  } catch (error) {
    throw new Error(`文件保存失败：${error}`);
  }
}

/**
 * 调用Tesseract.js OCR进行文字识别
 */
async function callTesseractOCR(
  imagePath: string,
  language: string = "chi_sim+eng"
): Promise<OCRResponse> {
  const startTime = Date.now();

  try {
    console.log(`🔍 调用Tesseract.js OCR API (语言: ${language})...`);

    // 配置Tesseract.js
    const result = await Tesseract.recognize(imagePath, language, {
      logger: (m) => console.log(m),
    });

    const processingTime = Date.now() - startTime;

    // 处理Tesseract.js响应
    const blocks: Array<{
      text: string;
      confidence: number;
      bbox: { x: number; y: number; width: number; height: number };
    }> = [];

    // 提取文本块信息
    if (result.data.words) {
      result.data.words.forEach((word: any) => {
        if (word.text && word.text.trim()) {
          blocks.push({
            text: word.text,
            confidence: word.confidence || 0,
            bbox: {
              x: word.bbox.x0 || 0,
              y: word.bbox.y0 || 0,
              width: (word.bbox.x1 || 0) - (word.bbox.x0 || 0),
              height: (word.bbox.y1 || 0) - (word.bbox.y0 || 0),
            },
          });
        }
      });
    }

    // 提取行文本块
    if (result.data.lines) {
      result.data.lines.forEach((line: any) => {
        if (line.text && line.text.trim()) {
          blocks.push({
            text: line.text,
            confidence: line.confidence || 0,
            bbox: {
              x: line.bbox.x0 || 0,
              y: line.bbox.y0 || 0,
              width: (line.bbox.x1 || 0) - (line.bbox.x0 || 0),
              height: (line.bbox.y1 || 0) - (line.bbox.y0 || 0),
            },
          });
        }
      });
    }

    const fullText = result.data.text || "";
    const averageConfidence = blocks.length > 0
      ? blocks.reduce((sum, block) => sum + block.confidence, 0) / blocks.length
      : result.data.confidence || 0;

    return {
      success: true,
      text: fullText.trim(),
      confidence: averageConfidence,
      blocks,
      language,
      processingTime,
    };
  } catch (error) {
    console.error("Tesseract.js OCR调用失败:", error);
    throw new Error(
      `OCR识别失败：${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}

/**
 * POST请求处理函数
 */
export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    const language = (formData.get("language") as string) || "chi_sim+eng";

    if (!imageFile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "未找到上传的图片文件",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // 验证文件类型
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(imageFile.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `不支持的文件类型：${imageFile.type}。支持的类型：${validTypes.join(", ")}`,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
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
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // 保存文件
    tempFilePath = await saveUploadedFile(imageFile);

    // 调用Tesseract.js OCR
    const ocrResult = await callTesseractOCR(tempFilePath, language);

    return new Response(JSON.stringify(ocrResult), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("OCR API错误:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "OCR处理失败",
        text: "",
        confidence: 0,
        blocks: [],
        language: "unknown",
        processingTime: 0,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } finally {
    // 清理临时文件
    if (tempFilePath) {
      try {
        const fs = require("fs");
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch (unlinkError) {
        console.error("临时文件清理失败:", unlinkError);
      }
    }
  }
}