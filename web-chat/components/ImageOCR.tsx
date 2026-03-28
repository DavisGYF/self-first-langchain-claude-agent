/**
 * 图片OCR识别组件 - 实现图片中文字的提取和识别
 *
 * 功能特性：
 * - 支持拖拽上传和点击上传图片
 * - 使用OCR技术识别图片中的文字
 * - 实时显示识别结果
 * - 支持多图片批量处理
 *
 * 技术实现：
 * - 前端：HTML5 Canvas + File API
 * - 后端：Tesseract.js 或云服务OCR API
 * - 多模态：识别结果与用户输入文本融合
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileImage, Copy, Check, X, Scan } from 'lucide-react';

/**
 * OCR识别结果的数据结构
 * 包含识别的文本、置信度、位置信息等
 */
interface OCRResult {
  text: string;           // 识别出的文字内容
  confidence: number;     // 识别置信度 (0-100)
  blocks: Array<{         // 文字块信息
    text: string;         // 块内文字
    confidence: number;   // 块置信度
    bbox: {               // 边界框坐标
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  language: string;       // 检测到的语言
  processingTime: number; // 处理耗时(毫秒)
}

/**
 * 图片OCR组件的属性接口
 * 定义组件需要的回调函数和配置选项
 */
interface ImageOCRProps {
  onOCRComplete: (result: OCRResult) => void;     // OCR完成后的回调函数
  onTextExtracted: (text: string) => void;        // 文字提取完成的回调
  maxFileSize?: number;                           // 最大文件大小 (默认10MB)
  supportedFormats?: string[];                    // 支持的文件格式
  language?: string;                              // OCR语言 (默认自动检测)
}

/**
 * 图片OCR识别主组件
 * 提供图片上传、预览、OCR识别的完整功能
 */
export default function ImageOCR({
  onOCRComplete,
  onTextExtracted,
  maxFileSize = 10 * 1024 * 1024, // 默认10MB
  supportedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  language = 'auto' // 自动检测语言
}: ImageOCRProps) {
  // ==================== 状态管理 ====================

  // 图片相关状态
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // 选中的图片预览URL
  const [imageFile, setImageFile] = useState<File | null>(null);          // 原始图片文件

  // OCR处理状态
  const [isProcessing, setIsProcessing] = useState(false);               // 是否正在处理中
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);     // OCR识别结果
  const [error, setError] = useState<string | null>(null);                // 错误信息

  // UI状态
  const [isDragOver, setIsDragOver] = useState(false);                    // 拖拽悬停状态
  const [copied, setCopied] = useState(false);                            // 复制状态

  // ==================== Refs引用 ====================

  // 文件输入框引用 - 用于触发文件选择
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==================== 工具函数 ====================

  /**
   * 验证文件是否符合要求
   * 检查文件类型、大小等限制
   *
   * @param file - 要验证的文件对象
   * @returns 验证结果，包含是否有效和错误信息
   */
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // 检查文件类型是否支持
    if (!supportedFormats.includes(file.type)) {
      return {
        valid: false,
        error: `不支持的文件格式：${file.type}。支持的格式：${supportedFormats.join(', ')}`
      };
    }

    // 检查文件大小是否超限
    if (file.size > maxFileSize) {
      const maxSizeMB = maxFileSize / (1024 * 1024);
      return {
        valid: false,
        error: `文件大小超过限制：${(file.size / (1024 * 1024)).toFixed(2)}MB > ${maxSizeMB}MB`
      };
    }

    // 文件验证通过
    return { valid: true };
  }, [supportedFormats, maxFileSize]);

  /**
   * 将文件转换为DataURL用于图片预览
   * 使用FileReader API读取文件内容
   *
   * @param file - 要转换的文件对象
   * @returns Promise解析为DataURL字符串
   */
  const fileToDataURL = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      // 读取成功回调
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          resolve(result);
        } else {
          reject(new Error('文件读取失败'));
        }
      };

      // 读取失败回调
      reader.onerror = () => {
        reject(new Error('文件读取错误'));
      };

      // 开始读取文件为DataURL格式
      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * 执行OCR文字识别
   * 调用后端API进行图片文字识别
   *
   * @param imageFile - 要识别的图片文件
   * @returns Promise解析为OCR识别结果
   */
  const performOCR = useCallback(async (imageFile: File): Promise<OCRResult> => {
    const startTime = Date.now(); // 记录开始时间

    try {
      // 创建FormData用于文件上传
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('language', language);

      // 调用后端OCR API
      const response = await fetch('/api/ocr/recognize', {
        method: 'POST',
        body: formData,
      });

      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR识别失败');
      }

      // 解析响应数据
      const result = await response.json();

      // 计算处理耗时
      const processingTime = Date.now() - startTime;

      // 构建完整的OCR结果
      return {
        ...result,
        processingTime
      };

    } catch (error) {
      // 捕获并重新抛出错误
      throw new Error(`OCR处理失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [language]);

  // ==================== 事件处理函数 ====================

  /**
   * 处理文件选择
   * 当用户选择文件时触发
   *
   * @param file - 用户选择的文件
   */
  const handleFileSelect = useCallback(async (file: File) => {
    // 重置之前的状态
    setError(null);
    setOcrResult(null);

    // 验证文件
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || '文件验证失败');
      return;
    }

    try {
      // 转换为预览URL
      const previewUrl = await fileToDataURL(file);

      // 更新状态
      setSelectedImage(previewUrl);
      setImageFile(file);

      // 自动开始OCR处理
      setIsProcessing(true);

      const result = await performOCR(file);

      // 更新OCR结果
      setOcrResult(result);

      // 调用回调函数
      onOCRComplete(result);
      onTextExtracted(result.text);

    } catch (error) {
      // 处理错误
      const errorMessage = error instanceof Error ? error.message : '处理失败';
      setError(errorMessage);
    } finally {
      // 无论成功失败都结束处理状态
      setIsProcessing(false);
    }
  }, [validateFile, fileToDataURL, performOCR, onOCRComplete, onTextExtracted]);

  /**
   * 处理输入框文件选择事件
   * 当用户通过文件选择器选择文件时触发
   */
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }

    // 重置input值，允许重复选择同一文件
    if (event.target) {
      event.target.value = '';
    }
  }, [handleFileSelect]);

  /**
   * 处理拖拽放置事件
   * 当用户拖拽文件到上传区域并释放时触发
   */
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  /**
   * 处理拖拽进入事件
   * 当拖拽的文件进入上传区域时触发
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  /**
   * 处理拖拽离开事件
   * 当拖拽的文件离开上传区域时触发
   */
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  /**
   * 处理点击上传区域
   * 触发文件选择器
   */
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 清除当前选择
   * 重置所有状态，允许重新选择
   */
  const handleClear = useCallback(() => {
    setSelectedImage(null);
    setImageFile(null);
    setOcrResult(null);
    setError(null);
    setCopied(false);
  }, []);

  /**
   * 复制识别结果到剪贴板
   * 提供快速复制功能
   */
  const handleCopy = useCallback(async () => {
    if (ocrResult?.text) {
      try {
        await navigator.clipboard.writeText(ocrResult.text);
        setCopied(true);

        // 2秒后重置复制状态
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('复制失败:', error);
      }
    }
  }, [ocrResult]);

  // ==================== 组件渲染 ====================

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">

      {/* 文件输入框 - 隐藏的实际文件选择控件 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={supportedFormats.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* 上传区域 */}
      {!selectedImage && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleUploadClick}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragOver
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-gray-600 hover:border-indigo-500 hover:bg-white/5'
            }
          `}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-2">
            点击或拖拽上传图片
          </p>
          <p className="text-sm text-gray-500">
            支持格式：PNG, JPG, JPEG, WebP (最大 {(maxFileSize / (1024 * 1024))}MB)
          </p>
        </div>
      )}

      {/* 图片预览和OCR结果 */}
      {selectedImage && (
        <div className="bg-white/5 rounded-xl overflow-hidden">

          {/* 图片预览头部 */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <FileImage className="w-5 h-5 text-indigo-400" />
              <span className="text-white font-medium">
                {imageFile?.name || '图片预览'}
              </span>
            </div>

            {/* 清除按钮 */}
            <button
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="清除"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* 图片预览 */}
          <div className="p-4">
            <img
              src={selectedImage}
              alt="待识别图片"
              className="max-w-full max-h-64 mx-auto rounded-lg object-contain"
            />
          </div>

          {/* 处理状态 */}
          {isProcessing && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Scan className="w-4 h-4 animate-spin" />
                <span className="text-sm">正在识别文字...</span>
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="px-4 pb-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* OCR结果 */}
          {ocrResult && (
            <div className="px-4 pb-4 space-y-3">

              {/* 结果头部信息 */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">
                    置信度：{ocrResult.confidence.toFixed(1)}%
                  </span>
                  <span className="text-gray-400">
                    耗时：{ocrResult.processingTime}ms
                  </span>
                  {ocrResult.language !== 'auto' && (
                    <span className="text-gray-400">
                      语言：{ocrResult.language}
                    </span>
                  )}
                </div>

                {/* 复制按钮 */}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 rounded transition-colors"
                  title="复制识别结果"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-400">
                    {copied ? '已复制' : '复制'}
                  </span>
                </button>
              </div>

              {/* 识别结果文本 */}
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">识别结果：</h4>
                <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {ocrResult.text}
                </div>
              </div>

              {/* 详细信息（可折叠） */}
              {ocrResult.blocks.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                    查看详细识别信息 ({ocrResult.blocks.length} 个文字块)
                  </summary>
                  <div className="mt-2 space-y-1">
                    {ocrResult.blocks.map((block, index) => (
                      <div key={index} className="bg-black/20 rounded p-2">
                        <div className="text-gray-300">{block.text}</div>
                        <div className="text-gray-500">
                          置信度：{block.confidence.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}