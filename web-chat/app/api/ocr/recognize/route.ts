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

import { NextRequest } from 'next/server';
import crypto from 'crypto';

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
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
  endpoint: 'https://ocr.cn-shanghai.aliyuncs.com',
  apiVersion: '2019-12-30',
  action: 'RecognizeGeneral'
};

/**
 * 生成阿里云API签名
 * 参考阿里云签名算法v1.0
 */
function generateSignature(params: Record<string, string>, secret: string): string {
  // 1. 按参数名称排序
  const sortedKeys = Object.keys(params).sort();

  // 2. 构造规范化查询字符串
  const canonicalizedQueryString = sortedKeys
    .map(key => {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(params[key]);
      return `${encodedKey}=${encodedValue}`;
    })
    .join('&');

  // 3. 构造待签名的字符串
  const stringToSign = `POST&${encodeURIComponent('/')}&${encodeURIComponent(canonicalizedQueryString)}`;

  // 4. 计算HMAC-SHA1签名
  const hmac = crypto.createHmac('sha1', `${secret}&`);
  hmac.update(stringToSign);
  const signature = hmac.digest('base64');

  return encodeURIComponent(signature);
}

/**
 * 保存上传文件到临时目录
 */
async function saveUploadedFile(file: File): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const tempFileName = `ocr_${timestamp}.${extension}`;

  // 使用项目临时目录
  const tempDir = '/tmp';
  const tempFilePath = `${tempDir}/${tempFileName}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    require('fs').promises.writeFile(tempFilePath, buffer);

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
      throw new Error('阿里云OCR配置不完整，请检查环境变量');
    }

    // 读取图片文件
    const fs = require('fs');
    const imageBuffer = await fs.promises.readFile(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    // 构造请求参数
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const nonce = Math.random().toString(36).substring(2);

    const requestParams: Record<string, string> = {
      AccessKeyId: ALIYUN_CONFIG.accessKeyId,
      Action: ALIYUN_CONFIG.action,
      Version: ALIYUN_CONFIG.apiVersion,
      Format: 'JSON',
      SignatureMethod: 'HMAC-SHA1',
      SignatureVersion: '1.0',
      SignatureNonce: nonce,
      Timestamp: timestamp,
      RegionId: 'cn-shanghai',
      ImageURL: '', // 这里需要传图片URL，我们改用ImageContent
      ImageContent: imageBase64,
      Scene: 'general'
    };

    // 生成签名
    const signature = generateSignature(requestParams, ALIYUN_CONFIG.accessKeySecret);
    requestParams.Signature = signature;

    console.log('🔍 调用阿里云OCR API...');

    // 发送请求
    const response = await fetch(ALIYUN_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: Object.keys(requestParams)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(requestParams[key])}`)
        .join('&')
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`阿里云API调用失败: ${JSON.stringify(result)}`);
    }

    // 处理阿里云OCR响应
    const processingTime = Date.now() - startTime;

    if (result.Data && result.Data.ocrResult && result.Data.ocrResult.elements) {
      const elements = result.Data.ocrResult.elements;
      let allText = '';
      const blocks: Array<{
        text: string;
        confidence: number;
        bbox: { x: number; y: number; width: number; height: number };
      }> = [];

      elements.forEach((element: any) => {
        const text = element.text || '';
        const confidence = parseFloat(element.score || '90');
        const bbox = element.boundary || { left: 0, top: 0, width: 0, height: 0 };

        if (text) {
          allText += text + '\n';
          blocks.push({
            text,
            confidence,
            bbox: {
              x: bbox.left || 0,
              y: bbox.top || 0,
              width: bbox.width || 0,
              height: bbox.height || 0
            }
          });
        }
      });

      return {
        success: true,
        text: allText.trim(),
        confidence: blocks.length > 0 ? blocks.reduce((sum, b) => sum + b.confidence, 0) / blocks.length : 90,
        blocks,
        language: 'auto',
        processingTime
      };
    } else {
      throw new Error('阿里云OCR返回数据格式异常');
    }

  } catch (error) {
    console.error('阿里云OCR调用失败:', error);
    throw new Error(`OCR识别失败：${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * POST请求处理函数
 */
export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

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

    // 保存文件
    tempFilePath = await saveUploadedFile(imageFile);

    // 调用阿里云OCR
    const ocrResult = await callAliyunOCR(tempFilePath);

    return new Response(JSON.stringify(ocrResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
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
    if (tempFilePath) {
      try {
        const fs = require('fs');
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch (unlinkError) {
        console.error('临时文件清理失败:', unlinkError);
      }
    }
  }
}