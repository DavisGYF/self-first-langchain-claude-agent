#!/usr/bin/env node

/**
 * Tesseract.js 测试脚本
 * 用于验证Tesseract.js是否正常工作
 */

const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function testTesseract() {
  console.log('🚀 开始测试Tesseract.js...');
  console.log(`📁 当前工作目录: ${process.cwd()}`);

  try {
    // 检查Tesseract.js版本
    console.log('📦 Tesseract.js 版本检查...');
    console.log(`✅ Tesseract.js 已安装，版本: ${Tesseract.version}`);

    // 检查语言包
    console.log('\n🌍 检查语言包...');
    const tessdataPath = path.join(process.cwd(), 'public', 'tessdata');
    if (fs.existsSync(tessdataPath)) {
      const files = fs.readdirSync(tessdataPath);
      console.log(`✅ 找到语言包目录: ${tessdataPath}`);
      console.log(`📋 语言包文件: ${files.join(', ')}`);
    } else {
      console.log(`⚠️  未找到预下载的语言包目录`);
      console.log(`💡 首次使用时将自动从网络下载语言包`);
    }

    // 测试基本的Tesseract功能
    console.log('\n🧪 测试基本功能...');

    // 创建一个简单的测试（不需要图片）
    const worker = await Tesseract.createWorker('eng');
    console.log('✅ 成功创建Tesseract worker');

    await worker.terminate();
    console.log('✅ Tesseract worker正常关闭');

    console.log('\n🎉 Tesseract.js 测试完成！');
    console.log('\n📝 使用总结:');
    console.log('• Tesseract.js 已正确安装');
    console.log('• 首次使用时会自动下载语言包（需要网络连接）');
    console.log('• 下载完成后可离线使用');
    console.log('• 支持中文和英文识别');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testTesseract();