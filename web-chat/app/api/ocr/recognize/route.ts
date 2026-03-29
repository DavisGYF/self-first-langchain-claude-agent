/**
 * 阿里云OCR识别API路由
 *
 * 功能特性：
 * - 接收上传的图片文件
 * - 调用阿里云OCR服务进行文字识别
 * - 支持高精度识别
 * - 返回结构化的识别结果
 *
 * API端点：POST /api/ocr/recognize
 * 请求格式：multipart/form-data
 * 响应格式：JSON
 */

import { NextRequest } from "next/server";
const PopCore = require("@alicloud/pop-core");

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
 * 阿里云OCR配置
 */
const ALIYUN_CONFIG = {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || "",
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || "",
  endpoint: "https://ocr.cn-shanghai.aliyuncs.com",
  apiVersion: "2019-12-30",
};

/**
 * 生成阿里云API签名
 * 参考阿里云签名算法v1.0
 */
/**
 * 保存上传文件到临时目录
 */
async function saveUploadedFile(file: File): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "jpg";
  const tempFileName = `ocr_${timestamp}.${extension}`;

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
 * 调用阿里云OCR API
 */
async function callAliyunOCR(imagePath: string): Promise<OCRResponse> {
  const startTime = Date.now();

  try {
    // 检查配置
    if (!ALIYUN_CONFIG.accessKeyId || !ALIYUN_CONFIG.accessKeySecret) {
      throw new Error("阿里云OCR配置不完整，请检查环境变量");
    }

    // 读取图片文件
    const fs = require("fs");
    const imageBuffer = await fs.promises.readFile(imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    const rpcClient = new PopCore.RPCClient({
      accessKeyId: ALIYUN_CONFIG.accessKeyId,
      accessKeySecret: ALIYUN_CONFIG.accessKeySecret,
      endpoint: ALIYUN_CONFIG.endpoint,
      apiVersion: ALIYUN_CONFIG.apiVersion,
    });

    console.log("🔍 调用阿里云OCR API (RPC)...");

    let result: any = null;
    let lastError: any = null;

    const attempts = [
      {
        action: "RecognizeCharacter",
        params: { ImageContent: imageBase64, RegionId: "cn-shanghai" },
      },
      {
        action: "RecognizeCharacterAdvanced",
        params: { ImageContent: imageBase64, RegionId: "cn-shanghai" },
      },
    ];

    for (const attempt of attempts) {
      try {
        result = await rpcClient.request(attempt.action, attempt.params, {
          method: "POST",
          timeout: 30000,
        });
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `阿里云OCR RPC尝试失败: ${attempt.action}`,
          err instanceof Error ? err.message : err,
        );

        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          err.code === "InvalidApi.NotPurchase"
        ) {
          break;
        }
      }
    }

    if (!result) {
      throw (
        lastError ?? new Error("阿里云API调用失败，无法匹配正确的 OCR 操作")
      );
    }

    // 处理阿里云OCR响应
    const processingTime = Date.now() - startTime;

    const blocks: Array<{
      text: string;
      confidence: number;
      bbox: { x: number; y: number; width: number; height: number };
    }> = [];
    const textParts: string[] = [];

    const normalizeBlock = (text: string, confidence: number, bbox: any) => {
      const safeConfidence = Number.isFinite(confidence) ? confidence : 90;
      const safeBbox = {
        x: bbox?.left ?? bbox?.x ?? bbox?.X ?? 0,
        y: bbox?.top ?? bbox?.y ?? bbox?.Y ?? 0,
        width: bbox?.width ?? bbox?.Width ?? bbox?.W ?? 0,
        height: bbox?.height ?? bbox?.Height ?? bbox?.H ?? 0,
      };
      textParts.push(text);
      blocks.push({
        text,
        confidence: safeConfidence,
        bbox: safeBbox,
      });
    };

    const tryParseArray = (items: any[], mapper: (item: any) => void) => {
      if (!Array.isArray(items)) return false;
      items.forEach(mapper);
      return items.length > 0;
    };

    const data = result?.Data ?? result;

    if (
      tryParseArray(data?.ocrResult?.elements, (element: any) => {
        const text = element.text || element.Text || "";
        const confidence = parseFloat(element.score || element.Score || "90");
        const bbox =
          element.boundary || element.Location || element.boundary || {};
        if (text) {
          normalizeBlock(text, confidence, bbox);
        }
      }) ||
      tryParseArray(data?.OCRContents, (item: any) => {
        const text = item.Text || item.text || item.OutputString || "";
        const confidence = parseFloat(
          item.Score || item.Score || item.Confidence || "90",
        );
        const bbox = item.Location || item.Boundary || item.BoundingBox || {};
        if (text) {
          normalizeBlock(text, confidence, bbox);
        }
      }) ||
      tryParseArray(data?.RecognizeResults, (item: any) => {
        const text = item.Text || item.text || "";
        const confidence = parseFloat(item.Score || item.Confidence || "90");
        const bbox = item.Location || item.Boundary || {};
        if (text) {
          normalizeBlock(text, confidence, bbox);
        }
      }) ||
      tryParseArray(data?.Items, (item: any) => {
        const text = item.Text || item.text || item.OutputString || "";
        const confidence = parseFloat(item.Score || item.Confidence || "90");
        const bbox = item.Location || item.Boundary || {};
        if (text) {
          normalizeBlock(text, confidence, bbox);
        }
      })
    ) {
      return {
        success: true,
        text: textParts.join("\n").trim(),
        confidence:
          blocks.length > 0
            ? blocks.reduce((sum, b) => sum + b.confidence, 0) / blocks.length
            : 90,
        blocks,
        language: "auto",
        processingTime,
      };
    }

    const fallbackText =
      data?.OutputString ||
      data?.PracticalText ||
      data?.Text ||
      result?.OutputString ||
      result?.Message ||
      "";

    if (fallbackText) {
      return {
        success: true,
        text: String(fallbackText).trim(),
        confidence: 90,
        blocks: [],
        language: "auto",
        processingTime,
      };
    }

    throw new Error("阿里云OCR返回数据格式异常");
  } catch (error) {
    console.error("阿里云OCR调用失败:", error);

    const errObj = error as any;
    if (
      errObj &&
      typeof errObj === "object" &&
      (errObj.code === "InvalidApi.NotPurchase" || errObj.result?.Code === "InvalidApi.NotPurchase")
    ) {
      throw new Error(
        "OCR识别失败：当前阿里云账号未购买或未开通该 OCR API，请前往阿里云控制台开通 OCR 服务并确认计费。",
      );
    }

    throw new Error(
      `OCR识别失败：${error instanceof Error ? error.message : "未知错误"}`,
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
        },
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
        },
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
        },
      );
    }

    // 保存文件
    tempFilePath = await saveUploadedFile(imageFile);

    // 调用阿里云OCR
    const ocrResult = await callAliyunOCR(tempFilePath);

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
      },
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
