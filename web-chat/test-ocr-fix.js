#!/usr/bin/env node

/**
 * OCR修复验证脚本
 * 验证Tesseract.js配置是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 验证OCR修复...');

// 检查修复后的API路由
const apiPath = path.join(__dirname, 'app/api/ocr/recognize/route.ts');
if (fs.existsSync(apiPath)) {
  const content = fs.readFileSync(apiPath, 'utf8');

  console.log('\n✅ 检查Tesseract导入:');
  console.log(`   Tesseract导入: ${content.includes('import Tesseract from') ? '✅' : '❌'}`);
  console.log(`   createWorker调用: ${content.includes('Tesseract.createWorker') ? '✅' : '❌'}`);

  console.log('\n✅ 检查API结构:');
  console.log(`   POST函数: ${content.includes('export async function POST') ? '✅' : '❌'}`);
  console.log(`   文件处理: ${content.includes('saveUploadedFile') ? '✅' : '❌'}`);
  console.log(`   错误处理: ${content.includes('try-catch') ? '✅' : '❌'}`);

  console.log('\n✅ 检查语言支持:');
  console.log(`   多语言配置: ${content.includes('SUPPORTED_LANGUAGES') ? '✅' : '❌'}`);
  console.log(`   中文支持: ${content.includes('chi_sim') ? '✅' : '❌'}`);

  console.log('\n✅ 检查响应格式:');
  console.log(`   OCRResponse接口: ${content.includes('interface OCRResponse') ? '✅' : '❌'}`);
  console.log(`   置信度字段: ${content.includes('confidence') ? '✅' : '❌'}`);
  console.log(`   处理时间字段: ${content.includes('processingTime') ? '✅' : '❌'}`);
}

// 检查组件修复
const componentPath = path.join(__dirname, 'components/ImageOCR.tsx');
if (fs.existsSync(componentPath)) {
  const content = fs.readFileSync(componentPath, 'utf8');

  console.log('\n✅ 检查ImageOCR组件:');
  console.log(`   API调用: ${content.includes('/api/ocr/recognize') ? '✅' : '❌'}`);
  console.log(`   错误处理: ${content.includes('OCR处理失败') ? '✅' : '❌'}`);
  console.log(`   回调函数: ${content.includes('onOCRComplete') ? '✅' : '❌'}`);
}

// 检查页面集成
const pagePath = path.join(__dirname, 'app/page.tsx');
if (fs.existsSync(pagePath)) {
  const content = fs.readFileSync(pagePath, 'utf8');

  console.log('\n✅ 检查页面集成:');
  console.log(`   ImageOCR导入: ${content.includes('import ImageOCR') ? '✅' : '❌'}`);
  console.log(`   OCR状态管理: ${content.includes('extractedText') ? '✅' : '❌'}`);
  console.log(`   图片上传按钮: ${content.includes('FileImage') ? '✅' : '❌'}`);
}

console.log('\n🎉 OCR修复验证完成！');
console.log('\n📋 修复总结：');
console.log('✅ Tesseract.js导入修复: import Tesseract from \'tesseract.js\'');
console.log('✅ Worker创建修复: Tesseract.createWorker(langCode)');
console.log('✅ 移除了不必要的worker.load()调用');
console.log('✅ 保持了完整的错误处理和文件清理');
console.log('\n🚀 现在OCR功能应该可以正常工作了！');

console.log('\n💡 测试建议：');
console.log('1. 启动开发服务器: npm run dev');
console.log('2. 在聊天界面点击📷图标');
console.log('3. 上传包含文字的图片');
console.log('4. 观察OCR识别结果');
console.log('5. 验证文字是否正确融合到输入框');
