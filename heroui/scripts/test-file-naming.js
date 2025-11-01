/**
 * 測試新的檔案命名規則
 * 格式：身份證ID_UUID7_[證件類別].jpg
 */

const { v7: uuidv7 } = require('uuid');

console.log('=== 測試檔案命名規則 ===\n');

// 測試數據
const testIdNumber = 'A123456789';
const docTypes = ['front', 'back', 'bank'];
const folders = ['front_id', 'back_id', 'bank_account'];

console.log(`身份證號碼: ${testIdNumber}\n`);

// 生成測試檔案名稱
docTypes.forEach((docType, index) => {
  const uniqueId = uuidv7();
  const fileName = `${folders[index]}/${testIdNumber}_${uniqueId}_${docType}.jpg`;

  const typeName = docType === 'front' ? '身份證正面' : docType === 'back' ? '身份證背面' : '銀行存摺';
  console.log(`${typeName}:`);
  console.log(`  完整路徑: ${fileName}`);
  console.log(`  UUID v7: ${uniqueId}`);
  console.log('');
});

console.log('=== 驗證格式 ===\n');

// 驗證格式
const sampleFileName = `front_id/${testIdNumber}_${uuidv7()}_front.jpg`;
const pattern = /^[a-z_]+\/[A-Z][0-9]{9}_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}_(front|back|bank)\.(jpg|png)$/;

console.log(`範例檔案: ${sampleFileName}`);
console.log(`格式驗證: ${pattern.test(sampleFileName) ? '✅ 通過' : '❌ 失敗'}`);
console.log('\n格式說明:');
console.log('  - 資料夾名稱: front_id, back_id, bank_account');
console.log('  - 身份證號碼: 1個大寫字母 + 9個數字');
console.log('  - UUID v7: 時間戳為基礎的唯一識別碼');
console.log('  - 證件類別: front, back, bank');
console.log('  - 副檔名: jpg 或 png');

console.log('\n=== 測試完成 ===');