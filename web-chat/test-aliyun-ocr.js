#!/usr/bin/env node

/**
 * 阿里云OCR配置测试脚本
 * 用于验证阿里云OCR配置是否正确
 */

const fs = require('fs');
const path = require('path');

// 检查环境变量
function checkEnvironment() {
  console.log('🔍 检查阿里云OCR配置...');

  const envPath = path.join(__dirname, '.env.local');

  if (!fs.existsSync(envPath)) {
    console.error('❌ 错误：未找到 .env.local 文件');
    console.log('💡 解决方案：请创建 .env.local 文件并配置阿里云AccessKey');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2];
    }
  });

  // 检查必要的配置
  const requiredVars = ['ALIYUN_ACCESS_KEY_ID', 'ALIYUN_ACCESS_KEY_SECRET'];
  let allConfigured = true;

  requiredVars.forEach(varName => {
    if (!envVars[varName] || envVars[varName].includes('你的')) {
      console.error(`❌ 缺少配置：${varName}`);
      allConfigured = false;
    } else {
      console.log(`✅ 已配置：${varName}`);
    }
  });

  if (!allConfigured) {
    console.log('\n💡 请参考以下步骤完成配置：');
    console.log('1. 访问 https://ram.console.aliyun.com/manage/ak');
    console.log('2. 创建AccessKey');
    console.log('3. 编辑 .env.local 文件');
    console.log('4. 填入你的AccessKey信息');
    return false;
  }

  console.log('✅ 环境变量配置检查通过');
  return true;
}

// 检查API路由文件
function checkAPIRoute() {
  console.log('\n🔍 检查API路由文件...');

  const routePath = path.join(__dirname, 'app/api/ocr/recognize/route.ts');

  if (!fs.existsSync(routePath)) {
    console.error('❌ 错误：未找到OCR API路由文件');
    return false;
  }

  const routeContent = fs.readFileSync(routePath, 'utf8');

  if (routeContent.includes('ALIYUN_ACCESS_KEY_ID')) {
    console.log('✅ OCR API路由文件存在且包含阿里云配置');
    return true;
  } else {
    console.error('❌ OCR API路由文件配置不正确');
    return false;
  }
}

// 检查前端组件
function checkFrontendComponent() {
  console.log('\n🔍 检查前端组件...');

  const componentPath = path.join(__dirname, 'components/ImageOCR.tsx');

  if (!fs.existsSync(componentPath)) {
    console.error('❌ 错误：未找到ImageOCR组件文件');
    return false;
  }

  const componentContent = fs.readFileSync(componentPath, 'utf8');

  if (componentContent.includes('/api/ocr/recognize')) {
    console.log('✅ 前端组件已配置调用阿里云OCR API');
    return true;
  } else {
    console.error('❌ 前端组件配置不正确');
    return false;
  }
}

// 主函数
function main() {
  console.log('🚀 开始阿里云OCR配置检查...\n');

  const checks = [
    checkEnvironment(),
    checkAPIRoute(),
    checkFrontendComponent()
  ];

  console.log('\n📊 检查结果总结：');

  if (checks.every(check => check)) {
    console.log('✅ 所有检查通过！阿里云OCR配置完成。');
    console.log('\n🎯 下一步：');
    console.log('1. 确保已开通阿里云OCR服务');
    console.log('2. 重启应用：npm run dev');
    console.log('3. 测试OCR功能');
  } else {
    console.log('❌ 存在配置问题，请根据提示修复。');
    console.log('\n📚 详细配置指南：');
    console.log('请查看 ALIYUN_OCR_SETUP.md 文件');
  }
}

// 运行检查
main();