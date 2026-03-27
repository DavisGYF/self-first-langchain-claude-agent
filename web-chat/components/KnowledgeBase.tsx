'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Database, X, Check } from 'lucide-react';

interface DocumentItem {
  filename: string;
  chunks: number;
  uploadedAt: string;
}

export default function KnowledgeBase() {
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载文档列表
  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/knowledge');
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('获取文档列表失败:', error);
    }
  };

  // 初始加载和定时刷新
  useState(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 30000); // 每 30 秒刷新一次
    return () => clearInterval(interval);
  });

  // 处理文件上传
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('正在上传...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadProgress('处理中...');
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待向量存储更新
        await fetchDocuments();
        setUploadProgress(`成功添加 ${data.chunks} 个文本块`);
        setTimeout(() => setUploadProgress(''), 3000);
      } else {
        setUploadProgress(`上传失败：${data.error}`);
        setTimeout(() => setUploadProgress(''), 3000);
      }
    } catch (error) {
      setUploadProgress(`上传失败：${(error as Error).message}`);
      setTimeout(() => setUploadProgress(''), 3000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 删除文档
  const handleDelete = async (filename: string) => {
    if (!confirm(`确定要删除 "${filename}" 吗？`)) return;

    try {
      const response = await fetch(`/api/knowledge?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchDocuments();
      } else {
        alert(`删除失败：${data.error}`);
      }
    } catch (error) {
      alert(`删除失败：${(error as Error).message}`);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 格式化时间
  const formatDate = (dateString: string): string => {
    if (!dateString) return '未知';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed right-4 top-20 w-80 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          <h3 className="text-white font-semibold">知识库</h3>
        </div>
        <button
          onClick={fetchDocuments}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="刷新"
        >
          <Check className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Upload Area */}
      <div className="p-4 border-b border-white/10">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.markdown"
          onChange={handleUpload}
          disabled={isUploading}
          className="hidden"
          id="knowledge-upload"
        />
        <label
          htmlFor="knowledge-upload"
          className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            isUploading
              ? 'border-gray-600 bg-gray-900/50'
              : 'border-gray-700 hover:border-indigo-500 hover:bg-white/5'
          }`}
        >
          <Upload className="w-6 h-6 text-gray-400 mb-2" />
          <span className="text-xs text-gray-400">
            {isUploading ? '上传中...' : '点击上传文档'}
          </span>
          <span className="text-xs text-gray-600 mt-1">PDF / TXT / MD (最大 10MB)</span>
        </label>

        {uploadProgress && (
          <p className="text-xs text-indigo-400 mt-2 text-center">{uploadProgress}</p>
        )}
      </div>

      {/* Document List */}
      <div className="p-2 max-h-96 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <FileText className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">暂无文档</p>
            <p className="text-xs text-gray-600 mt-1">上传文档以启用 RAG 功能</p>
          </div>
        ) : (
          <div className="space-y-1">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg group transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-500">
                      {doc.chunks} 块 • {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.filename)}
                  className="p-1.5 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <p className="text-xs text-gray-500 text-center">
          已上传 {documents.length} 个文档
        </p>
      </div>
    </div>
  );
}
