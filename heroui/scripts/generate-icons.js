/**
 * 從 SVG 生成 PWA 所需的 PNG 圖示
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public');

// 檢查 SVG 檔案是否存在
if (!fs.existsSync(svgPath)) {
  console.error('❌ 找不到 icon.svg 檔案');
  process.exit(1);
}

const sizes = [192, 512];

async function generateIcons() {
  console.log('🎨 開始生成 PWA 圖示...\n');

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✅ 已生成: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ 生成 ${size}x${size} 失敗:`, error.message);
    }
  }

  console.log('\n🎉 圖示生成完成！');
}

generateIcons().catch(console.error);