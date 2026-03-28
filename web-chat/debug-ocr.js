#!/usr/bin/env node

/**
 * OCR API调试脚本
 * 诊断OCR功能的问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始OCR功能诊断...');

// 检查API路由文件
const apiPath = path.join(__dirname, 'app/api/ocr/recognize/route.ts');
console.log('\n📁 检查API路由文件:');
console.log(`   路径: ${apiPath}`);
console.log(`   存在: ${fs.existsSync(apiPath) ? '✅' : '❌'}`);

if (fs.existsSync(apiPath)) {
  const content = fs.readFileSync(apiPath, 'utf8');

  // 检查关键函数
  console.log('\n🔧 检查关键函数:');
  console.log(`   POST函数: ${content.includes('export async function POST') ? '✅' : '❌'}`);
  console.log(`   performOCR函数: ${content.includes('async function performOCR') ? '✅' : '❌'}`);
  console.log(`   Tesseract调用: ${content.includes('Tesseract.recognize') ? '✅' : '❌'}`);
  console.log(`   文件保存函数: ${content.includes('saveUploadedFile') ? '✅' : '❌'}`);

  // 检查错误处理
  console.log('\n🛡️ 检查错误处理:');
  console.log(`   try-catch: ${content.includes('try {') ? '✅' : '❌'}`);
  console.log(`   错误返回: ${content.includes('success: false') ? '✅' : '❌'}`);
  console.log(`   临时文件清理: ${content.includes('unlink') ? '✅' : '❌'}`);
}

// 检查组件文件
const componentPath = path.join(__dirname, 'components/ImageOCR.tsx');
console.log('\n📁 检查ImageOCR组件:');
console.log(`   路径: ${componentPath}`);
console.log(`   存在: ${fs.existsSync(componentPath) ? '✅' : '❌'}`);

if (fs.existsSync(componentPath)) {
  const content = fs.readFileSync(componentPath, 'utf8');

  console.log('\n🔧 检查组件功能:');
  console.log(`   API调用: ${content.includes('/api/ocr/recognize') ? '✅' : '❌'}`);
  console.log(`   错误处理: ${content.includes('OCR处理失败') ? '✅' : '❌'}`);
  console.log(`   状态管理: ${content.includes('isProcessing') ? '✅' : '❌'}`);
  console.log(`   文件验证: ${content.includes('validateFile') ? '✅' : '❌'}`);
}

// 检查依赖
const packageJsonPath = path.join(__dirname, 'package.json');
console.log('\n📦 检查依赖:');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = packageJson.dependencies || {};
  console.log(`   Tesseract.js: ${deps['tesseract.js'] || '❌ 未安装'}`);
  console.log(`   Next.js: ${deps['next'] || '❌ 未安装'}`);
  console.log(`   React: ${deps['react'] || '❌ 未安装'}`);
}

console.log('\n🎯 可能的问题诊断:');
console.log('   1. 🔄 "strict-origin-when-cross-origin" - CORS策略问题');
console.log('   2. ⏱️  "一直待处理" - 可能是OCR处理超时');
console.log('   3. 🌐  网络请求被浏览器安全策略拦截');

console.log('\n💡 建议解决方案:');
console.log('   1. ✅ 检查浏览器控制台是否有CORS错误');
console.log('   2. ✅ 增加OCR处理的超时时间');
console.log('   3. ✅ 检查服务器是否正确响应OPTIONS预检请求');
console.log('   4. ✅ 验证Tesseract.js语言包是否正确下载');

console.log('\n🔧 快速修复建议:');
console.log('   1. 在API路由中添加CORS头部');
console.log('   2. 增加处理进度日志');
console.log('   3. 添加更详细的错误信息');
console.log('   4. 实现处理超时机制');

console.log('\n📋 诊断完成！');
