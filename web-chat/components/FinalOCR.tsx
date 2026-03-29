/**
 * 最终OCR组件 - 智能选择最佳方案
 * 1. 优先使用浏览器Tesseract.js（零下载，本地处理）
 * 2. 备选使用服务端API（当浏览器方案失败时）
 * 3. 最后使用模拟结果（当服务端也未配置时）
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileImage, Copy, Check, X, Scan, Globe, AlertTriangle, Wifi, Cpu } from 'lucide-react';

interface OCRResult {
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
  method?: string; // 使用的识别方法
}

interface FinalOCRProps {
  onOCRComplete: (result: OCRResult) => void;
  onTextExtracted: (text: string) => void;
  maxFileSize?: number;
  supportedFormats?: string[];
}

const LANGUAGE_OPTIONS = [
  { code: 'auto', label: '自动检测', description: 'Auto Detection (中英混合)' },
  { code: 'zh', label: '中文', description: 'Chinese (简体中文)' },
  { code: 'en', label: '英文', description: 'English' },
  { code: 'ja', label: '日文', description: 'Japanese' },
  { code: 'ko', label: '韩文', description: 'Korean' },
];

export default function FinalOCR({
  onOCRComplete,
  onTextExtracted,
  maxFileSize = 10 * 1024 * 1024,
  supportedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
}: FinalOCRProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [apiProgress, setApiProgress] = useState<string>('');
  const [recognitionMethod, setRecognitionMethod] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 验证文件
  const validateFile = useCallback((file: File) => {
    if (!supportedFormats.includes(file.type)) {
      return { valid: false, error: `不支持的文件格式：${file.type}` };
    }
    if (file.size > maxFileSize) {
      return { valid: false, error: `文件大小超过限制：${(file.size / (1024 * 1024)).toFixed(2)}MB > 10MB` };
    }
    return { valid: true };
  }, [supportedFormats, maxFileSize]);

  // 文件转DataURL
  const fileToDataURL = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        result ? resolve(result) : reject(new Error('文件读取失败'));
      };
      reader.onerror = () => reject(new Error('文件读取错误'));
      reader.readAsDataURL(file);
    });
  }, []);

  // 浏览器端OCR（Tesseract.js）- OCR方案1：首选方案，零服务器负载，保护用户隐私
  const performBrowserOCR = useCallback(async (file: File, language: string): Promise<OCRResult> => {
    const startTime = Date.now(); // 记录OCR开始时间，用于计算总处理时长
    setRecognitionMethod('🌐 浏览器OCR (Tesseract.js)'); // 在UI上显示当前正在使用的OCR方案

    try {
      setApiProgress('正在加载Tesseract.js...'); // 更新进度条显示：开始加载Tesseract.js库
      const Tesseract = await import('tesseract.js'); // 动态导入Tesseract.js库（WebAssembly版本）

      // 检查浏览器兼容性：确保浏览器支持Tesseract.js的WebAssembly功能
      if (!Tesseract.createWorker) {
        throw new Error('当前浏览器不支持Tesseract.js');
      }

      // 映射语言参数：将用户选择的语言转换为Tesseract.js支持的语言代码格式
      let tessLang = 'chi_sim+eng'; // 默认使用中英混合模式，适合大部分场景
      switch (language) {
        case 'zh': tessLang = 'chi_sim'; break; // 简体中文专用模式
        case 'en': tessLang = 'eng'; break;     // 英文专用模式
        case 'ja': tessLang = 'jpn'; break;     // 日文专用模式
        case 'ko': tessLang = 'kor'; break;     // 韩文专用模式
        default: tessLang = 'chi_sim+eng';      // 默认中英混合模式
      }

      setApiProgress('正在初始化OCR引擎...'); // 更新进度条显示：Tesseract引擎初始化阶段

      // 执行OCR识别：核心识别过程，使用Tesseract.js的recognize方法
      const result = await Tesseract.recognize(file, tessLang, {
        logger: (m) => { // 进度回调函数：实时更新UI进度显示
          if (m.status === 'recognizing text') { // 正在识别文字阶段
            const progress = Math.round(m.progress * 100); // 计算进度百分比
            setApiProgress(`正在识别文字... ${progress}%`); // 显示实时识别进度
          } else if (m.status.includes('loading')) { // 正在加载资源阶段
            setApiProgress('正在加载语言包... (首次使用需要下载)'); // 显示语言包下载进度
          } else { // 其他状态
            setApiProgress(m.status); // 显示当前状态信息
          }
        },
        // 添加worker配置以减少SSE相关错误和网络加载问题
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/worker.min.js', // Web Worker文件CDN路径
        langPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/lang-data/',        // 语言数据包CDN路径
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract-core.js', // 核心WASM文件CDN路径
        // 错误处理器：捕获并记录Tesseract worker中的错误
        errorHandler: (err) => {
          console.warn('Tesseract worker error:', err); // 记录worker错误到控制台
        }
      });

      const processingTime = Date.now() - startTime; // 计算OCR处理总耗时（毫秒）

      // 返回标准化OCR结果结构，供上层组件使用
      return {
        text: result.data.text || '',           // 识别出的文字内容，若无则为空字符串
        confidence: result.data.confidence || 0, // 识别置信度（0-100），表示识别结果的可靠性
        blocks: [],                             // 文字块信息数组（当前Tesseract.js浏览器版本不支持详细块信息）
        language: language,                     // 用户选择的识别语言
        processingTime,                        // OCR处理总耗时（毫秒）
        method: 'browser-tesseract'            // 标识此结果来自浏览器Tesseract方案
      };
    } catch (error) {
      throw new Error(`浏览器OCR失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, []);

  // 服务端OCR（多方案备选）- OCR方案2&3：服务端Tesseract + 在线OCR服务
  const performServerOCR = useCallback(async (file: File, language: string): Promise<OCRResult> => {
    const startTime = Date.now(); // 记录服务端OCR开始时间
    setRecognitionMethod('🔄 服务端OCR'); // 在UI上显示当前切换到服务端OCR方案

    // 方案1: 尝试服务端Tesseract（第二优先级）
    try {
      setApiProgress('正在尝试服务端Tesseract...'); // 更新进度显示：开始调用服务端Tesseract

      const formData = new FormData(); // 创建FormData对象用于文件上传
      formData.append('image', file);   // 添加图片文件到表单
      formData.append('language', language); // 添加语言参数到表单

      // 添加超时控制：防止服务端响应过慢导致用户体验差
      const controller = new AbortController(); // 创建请求中止控制器
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 设置15秒超时限制

      // 调用服务端Tesseract API
      const response = await fetch('/api/ocr/server-tesseract', {
        method: 'POST',           // 使用POST方法上传文件
        body: formData,          // 发送包含图片的表单数据
        signal: controller.signal, // 绑定超时中止信号
      });

      clearTimeout(timeoutId); // 清除超时定时器（请求已完成）

      const result = await response.json(); // 解析服务端返回的JSON结果

      // 检查服务端响应：成功且不是模拟结果时才返回
      if (response.ok && result.success && !result.text.includes('演示结果')) {
        const processingTime = Date.now() - startTime; // 计算服务端OCR总耗时
        return {
          ...result,
          processingTime,
          method: 'server-tesseract'
        };
      }
    } catch (error) {
      console.log('服务端Tesseract失败，尝试在线OCR:', error);
    }

    // 方案2: 尝试免费在线OCR服务（第三优先级，最终备选方案）
    try {
      setApiProgress('正在尝试在线OCR服务...'); // 更新进度显示：开始调用在线OCR API

      // 添加超时控制：在线服务网络延迟可能较大，设置较短超时
      const controller = new AbortController(); // 创建请求中止控制器
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 设置10秒超时限制

      const formData = new FormData(); // 创建FormData对象用于文件上传
      formData.append('image', file); // 添加图片文件到表单（无需语言参数，由服务端处理）

      // 调用在线OCR服务API（OCR.space免费服务）
      const response = await fetch('/api/ocr/free-online', {
        method: 'POST',           // 使用POST方法上传文件
        body: formData,          // 发送包含图片的表单数据
        signal: controller.signal, // 绑定超时中止信号
      });

      clearTimeout(timeoutId); // 清除超时定时器（请求已完成）

      const result = await response.json(); // 解析在线OCR服务返回的JSON结果

      // 检查在线OCR服务响应：成功时返回结果
      if (response.ok && result.success) {
        const processingTime = Date.now() - startTime; // 计算在线OCR总耗时
        return {
          ...result,           // 继承在线OCR服务的所有结果字段
          blocks: [],          // 补充空blocks字段（在线OCR未提供块信息）
          language,           // 补充用户选择的语言信息
          processingTime,     // 补充处理时间信息
          method: 'online-api' // 标识此结果来自在线OCR服务
        };
      }
    } catch (error) {
      console.log('在线OCR失败:', error);
    }

    // 所有方案都失败，抛出错误
    throw new Error('所有OCR服务均不可用');
  }, []);

  // 主要OCR处理函数 - 智能选择方案
  const performOCR = useCallback(async (file: File): Promise<OCRResult> => {
    // 方案1: 尝试浏览器Tesseract.js
    try {
      console.log('尝试浏览器OCR...');
      return await performBrowserOCR(file, selectedLanguage);
    } catch (browserError) {
      console.log('浏览器OCR失败，尝试服务端OCR:', browserError);

      // 方案2: 尝试服务端API
      try {
        // 添加延迟以避免过快请求
        await new Promise(resolve => setTimeout(resolve, 500));
        return await performServerOCR(file, selectedLanguage);
      } catch (serverError) {
        console.log('服务端OCR失败:', serverError);

        // 方案3: 返回友好的错误信息
        const processingTime = Date.now() - Date.now();
        setRecognitionMethod('❌ OCR服务不可用');

        let errorMessage = '很抱歉，所有OCR识别服务均暂时不可用。\n\n';

        if (browserError instanceof Error) {
          if (browserError.message.includes('SSE')) {
            errorMessage += `浏览器兼容性问题: ${browserError.message}\n\n`;
            errorMessage += `建议解决方案:\n` +
              `1. 尝试使用Chrome、Edge或Firefox浏览器\n` +
              `2. 确保浏览器支持WebAssembly\n` +
              `3. 检查网络连接是否正常\n\n`;
          } else {
            errorMessage += `浏览器OCR错误: ${browserError.message}\n\n`;
          }
        }

        if (serverError instanceof Error) {
          errorMessage += `服务端错误: ${serverError.message}\n\n`;
        }

        errorMessage += `备选方案:\n` +
          `1. 稍后重试（网络问题可能已解决）\n` +
          `2. 使用其他浏览器或设备\n` +
          `3. 联系技术支持\n\n` +
          `技术说明:\n` +
          `- 浏览器Tesseract.js需要WebAssembly支持\n` +
          `- 服务端OCR需要正确的引擎配置\n` +
          `- 在线OCR需要网络连接`;

        return {
          text: errorMessage,
          confidence: 0,
          blocks: [],
          language: selectedLanguage,
          processingTime,
          method: 'error'
        };
      }
    }
  }, [selectedLanguage, performBrowserOCR, performServerOCR]);

  // 处理文件选择
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setOcrResult(null);
    setRecognitionMethod('');

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

  // 事件处理函数
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileSelect(file);
    if (event.target) event.target.value = '';
  }, [handleFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
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
    setRecognitionMethod('');
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

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={supportedFormats.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* 语言选择 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Globe className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">识别语言：</span>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
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
            ${isDragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-600 hover:border-indigo-500 hover:bg-white/5'}
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
            智能选择最佳OCR方案：浏览器优先，服务端备选
          </p>
        </div>
      )}

      {/* 图片预览和结果 */}
      {selectedImage && (
        <div className="bg-white/5 rounded-xl overflow-hidden">
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Scan className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{apiProgress || '正在识别文字...'}</span>
                </div>
                {recognitionMethod && (
                  <div className="text-xs text-gray-400">
                    使用方案: {recognitionMethod}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="px-4 pb-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* OCR结果 */}
          {ocrResult && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">置信度：{ocrResult.confidence.toFixed(1)}%</span>
                  <span className="text-gray-400">耗时：{ocrResult.processingTime}ms</span>
                  <span className="text-gray-400">字数：{ocrResult.text.length}</span>
                </div>

                <div className="flex items-center gap-2">
                  {recognitionMethod && (
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      {recognitionMethod.includes('浏览器') ? (
                        <Cpu className="w-3 h-3" />
                      ) : recognitionMethod.includes('服务端') ? (
                        <Wifi className="w-3 h-3" />
                      ) : recognitionMethod.includes('在线') ? (
                        <Globe className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span className="hidden sm:inline">
                        {recognitionMethod.split(' ')[0]}
                      </span>
                    </div>
                  )}
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
              </div>

              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">识别结果：</h4>
                <div className="text-white text-sm leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {ocrResult.text || '（未能识别出文字）'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}