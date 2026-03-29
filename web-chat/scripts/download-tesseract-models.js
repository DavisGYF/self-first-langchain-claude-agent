/**
 * 预下载Tesseract.js语言包
 * 运行: node scripts/download-tesseract-models.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 创建语言包目录
const tessdataDir = path.join(process.cwd(), 'public', 'tessdata');
if (!fs.existsSync(tessdataDir)) {
  fs.mkdirSync(tessdataDir, { recursive: true });
}

// 要下载的语言包（使用国内镜像源）
const models = [
  {
    name: 'chi_sim.traineddata',  // 简体中文
    url: 'https://gitee.com/monkeycc/tessdata/raw/master/chi_sim.traineddata'
  },
  {
    name: 'eng.traineddata',      // 英文
    url: 'https://gitee.com/monkeycc/tessdata/raw/master/eng.traineddata'
  }
];

// 下载函数
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`下载失败: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ 已下载: ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// 批量下载
async function downloadAllModels() {
  console.log('🚀 开始下载Tesseract.js语言包...');
  console.log(`📁 保存目录: ${tessdataDir}`);

  for (const model of models) {
    const filepath = path.join(tessdataDir, model.name);

    if (fs.existsSync(filepath)) {
      console.log(`⏭️  已存在: ${model.name}`);
      continue;
    }

    try {
      console.log(`📥 正在下载: ${model.name}`);
      await downloadFile(model.url, filepath);
    } catch (error) {
      console.error(`❌ 下载失败 ${model.name}:`, error.message);
    }
  }

  console.log('🎉 语言包下载完成！');
}

downloadAllModels().catch(console.error);