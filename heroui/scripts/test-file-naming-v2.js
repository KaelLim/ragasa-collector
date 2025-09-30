/**
 * 測試檔案命名規則 v2.0 - 僅使用 UUID v7（保護隱私）
 */

const { v7: uuidv7 } = require('uuid');

// 模擬上傳檔案函數
function generateFileName(folder, docType) {
  const uniqueId = uuidv7();
  const fileExt = 'jpg';
  return `${folder}/${uniqueId}_${docType}.${fileExt}`;
}

console.log('📋 檔案命名規則測試 v2.0\n');
console.log('格式: {folder}/{UUID_v7}_{證件類別}.{副檔名}\n');
console.log('🔒 隱私保護: 不再使用身份證號，僅使用 UUID v7\n');
console.log('----------------------------------------\n');

// 測試身份證正面
const frontIdPath = generateFileName('front_id', 'front');
console.log('身份證正面:');
console.log('  完整路徑:', frontIdPath);
console.log('  UUID v7:', frontIdPath.split('/')[1].split('_')[0]);
console.log();

// 測試身份證背面
const backIdPath = generateFileName('back_id', 'back');
console.log('身份證背面:');
console.log('  完整路徑:', backIdPath);
console.log('  UUID v7:', backIdPath.split('/')[1].split('_')[0]);
console.log();

// 測試銀行存摺
const bankPath = generateFileName('bank_account', 'bank');
console.log('銀行存摺:');
console.log('  完整路徑:', bankPath);
console.log('  UUID v7:', bankPath.split('/')[1].split('_')[0]);
console.log();

console.log('----------------------------------------\n');
console.log('✅ UUID v7 特性驗證:\n');

// 驗證 UUID v7 的時間排序特性
const ids = [];
for (let i = 0; i < 5; i++) {
  ids.push(uuidv7());
}

console.log('生成 5 個連續 UUID v7:');
ids.forEach((id, idx) => {
  console.log('  ' + (idx + 1) + '. ' + id);
});

console.log('\n排序後（應保持原順序）:');
const sorted = [...ids].sort();
const isSorted = JSON.stringify(ids) === JSON.stringify(sorted);
console.log('  時間排序正確: ' + (isSorted ? '✅ 是' : '❌ 否'));

console.log('\n✅ 隱私保護優勢:');
console.log('  - 檔案名稱不包含個人資料');
console.log('  - 無法從檔案名推測申請人身份');
console.log('  - UUID v7 全域唯一，避免碰撞');
console.log('  - 基於時間戳，自然排序');
