import React, { useState } from 'react';
import ImageOCR from '@/components/ImageOCR';

export default function TestOCR() {
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [extractedText, setExtractedText] = useState<string>('');

  const handleOCRComplete = (result: any) => {
    console.log('OCR识别完成:', result);
    setOcrResult(result);
  };

  const handleTextExtracted = (text: string) => {
    console.log('提取的文字:', text);
    setExtractedText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">OCR 功能测试</h1>

        <div className="space-y-6">
          {/* OCR组件 */}
          <div className="bg-white/5 rounded-xl p-6">
            <h2 className="text-lg font-medium text-white mb-4">图片上传和识别</h2>
            <ImageOCR
              onOCRComplete={handleOCRComplete}
              onTextExtracted={handleTextExtracted}
              language="auto"
            />
          </div>

          {/* 识别结果显示 */}
          {extractedText && (
            <div className="bg-white/5 rounded-xl p-6">
              <h2 className="text-lg font-medium text-white mb-4">识别结果</h2>
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-white whitespace-pre-wrap">{extractedText}</p>
              </div>
            </div>
          )}

          {/* 详细信息 */}
          {ocrResult && (
            <div className="bg-white/5 rounded-xl p-6">
              <h2 className="text-lg font-medium text-white mb-4">详细信息</h2>
              <div className="bg-black/30 rounded-lg p-4">
                <pre className="text-gray-300 text-sm overflow-auto">
                  {JSON.stringify(ocrResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}