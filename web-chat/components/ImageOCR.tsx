/**
 * 图片OCR识别组件 - 阿里云OCR API实现
 *
 * 功能特性：
 * - 支持拖拽上传和点击上传图片
 * - 调用阿里云OCR API进行高精度文字识别
 * - 实时显示识别结果
 * - 支持多语言识别
 *
 * 技术实现：
 * - 云端识别：使用阿里云OCR服务
 * - 无需下载语言包，首次使用即可识别
 * - 识别精度更高，支持更多语言
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileImage, Copy, Check, X, Scan, Globe } from 'lucide-react';

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
 */
interface ImageOCRProps {
  onOCRComplete: (result: OCRResult) => void;     // OCR完成后的回调函数
  onTextExtracted: (text: string) => void;        // 文字提取完成的回调
  maxFileSize?: number;                           // 最大文件大小 (默认10MB)
  supportedFormats?: string[];                    // 支持的文件格式
}

/**
 * 支持的语言配置
 */
const LANGUAGE_OPTIONS = [
  { code: 'auto', label: '自动检测', description: 'Auto Detection' },
  { code: 'zh', label: '中文', description: 'Chinese' },
  { code: 'en', label: '英文', description: 'English' },
  { code: 'ja', label: '日文', description: 'Japanese' },
  { code: 'ko', label: '韩文', description: 'Korean' },
];

/**
 * 图片OCR识别主组件 - 纯前端实现
 */
export default function ImageOCR({
  onOCRComplete,
  onTextExtracted,
  maxFileSize = 10 * 1024 * 1024,
  supportedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
}: ImageOCRProps) {
  // ==================== 状态管理 ====================
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [apiProgress, setApiProgress] = useState<string>('');

  // ==================== Refs引用 ====================
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==================== 工具函数 ====================

  /**
   * 验证文件是否符合要求
   */
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!supportedFormats.includes(file.type)) {
      return {
        valid: false,
        error: `不支持的文件格式：${file.type}。支持的格式：${supportedFormats.join(', ')}`
      };
    }

    if (file.size > maxFileSize) {
      const maxSizeMB = maxFileSize / (1024 * 1024);
      return {
        valid: false,
        error: `文件大小超过限制：${(file.size / (1024 * 1024)).toFixed(2)}MB > ${maxSizeMB}MB`
      };
    }

    return { valid: true };
  }, [supportedFormats, maxFileSize]);

  /**
   * 将文件转换为DataURL用于图片预览
   */
  const fileToDataURL = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          resolve(result);
        } else {
          reject(new Error('文件读取失败'));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取错误'));
      };

      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * 执行OCR文字识别 - 调用阿里云OCR API
   */
  const performOCR = useCallback(async (file: File): Promise<OCRResult> => {
    const startTime = Date.now();

    try {
      setApiProgress('正在连接阿里云OCR服务...');

      // 创建FormData
      const formData = new FormData();
      formData.append('image', file);
      formData.append('language', selectedLanguage);

      setApiProgress('正在上传图片...');

      // 调用后端API
      const response = await fetch('/api/ocr/recognize', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'OCR识别失败');
      }

      const processingTime = Date.now() - startTime;

      return {
        text: result.text || '',
        confidence: result.confidence || 0,
        blocks: result.blocks || [],
        language: result.language || selectedLanguage,
        processingTime,
      };
    } catch (err) {
      throw new Error(`OCR 识别失败：${err instanceof Error ? err.message : '未知错误'}`);
    }
  }, [selectedLanguage]);

  /**
   * 切换语言
   */
  const handleLanguageChange = useCallback((newLanguage: string) => {
    setSelectedLanguage(newLanguage);
  }, []);

  // ==================== 事件处理函数 ====================

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setOcrResult(null);

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || '文件验证失败');
      return;
    }

    try {
      const previewUrl = await fileToDataURL(file);
      setSelectedImage(previewUrl);
      setImageFile(file);
      setIsProcessing(true);

      const result = await performOCR(file);

      setOcrResult(result);
      onOCRComplete(result);
      onTextExtracted(result.text);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '处理失败';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [validateFile, fileToDataURL, performOCR, onOCRComplete, onTextExtracted]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    setSelectedImage(null);
    setImageFile(null);
    setOcrResult(null);
    setError(null);
    setCopied(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (ocrResult?.text) {
      try {
        await navigator.clipboard.writeText(ocrResult.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('复制失败:', error);
      }
    }
  }, [ocrResult]);

  // ==================== 组件渲染 ====================

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={supportedFormats.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* 语言选择器 */}
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">识别语言：</span>
        <select
          value={selectedLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={isProcessing}
          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-gray-800">
              {lang.label}
            </option>
          ))}
        </select>
      </div>

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
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-2">
            {isProcessing ? '处理中...' : '点击或拖拽上传图片'}
          </p>
          <p className="text-sm text-gray-500">
            支持格式：PNG, JPG, JPEG, WebP (最大 {(maxFileSize / (1024 * 1024))}MB)
          </p>
          <p className="text-xs text-gray-600 mt-2">
            使用阿里云OCR服务，识别精度更高
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
                <span className="text-sm">{apiProgress || '正在识别文字...'}</span>
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
                </div>

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
                  {ocrResult.text || '（未能识别出文字）'}
                </div>
              </div>

              {/* 详细信息 */}
              {ocrResult.blocks.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                    查看详细识别信息 ({ocrResult.blocks.length} 个文字块)
                  </summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
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
