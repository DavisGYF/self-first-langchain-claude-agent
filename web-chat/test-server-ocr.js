// 测试服务端OCR API
const path = require('path');
const fs = require('fs');

async function testServerOCR() {
  try {
    // 读取测试图片
    const imagePath = path.join(__dirname, 'public', 'test-image.png');

    // 检查是否有测试图片，如果没有则创建
    if (!fs.existsSync(imagePath)) {
      console.log('请添加测试图片到 public/test-image.png');
      return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const blob = new Blob([imageBuffer]);

    // 创建FormData
    const formData = new FormData();
    formData.append('image', blob, 'test-image.png');
    formData.append('language', 'chi_sim+eng');

    // 调用API
    const response = await fetch('http://localhost:3000/api/ocr/server-tesseract', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('OCR结果:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testServerOCR();
}

module.exports = { testServerOCR };