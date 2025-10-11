/**
 * 訪視紀錄資料結構
 * 對應 Ragic 表單: https://ap11.ragic.com/TCTCharity/kava-kasha-temporary-form/15
 */

/**
 * 村名選項常數
 */
export const VILLAGE_OPTIONS = [
  '大安村',
  '大馬村',
  '大平村',
  '大華村',
  '大同村',
  '東富村',
  '其他'
] as const

/**
 * 村名代碼對照表
 */
export const VILLAGE_CODE_MAP: Record<string, string> = {
  '大安村': 'A',
  '大馬村': 'M',
  '大平村': 'P',
  '大華村': 'H',
  '大同村': 'T',
  '東富村': 'F',
  '其他': 'O'
}

/**
 * 家戶特殊註記選項常數
 */
export const HOUSEHOLD_NOTE_OPTIONS = [
  '獨老或兩老相依',
  '有身障人口',
  '有失能人口',
  '原民',
  '新住民',
  '法親'
] as const

/**
 * 後續需求項目選項常數
 */
export const FOLLOW_UP_NEED_OPTIONS = [
  '經濟需求',
  '就學子女關懷',
  '居家修繕',
  '居住安置',
  '醫療資源',
  '長照資源',
  '輔具資源',
  '心靈陪伴',
  '水電維護',
  '鐵捲門維護'
] as const

/**
 * 福利身分選項常數
 */
export const WELFARE_STATUS_OPTIONS = [
  '無',
  '低收入戶',
  '中低收入戶'
] as const

/**
 * 訪視紀錄 JSONB 資料結構
 */
export interface VisitRecordData {
  basic: {
    // 華加沙編碼 = visit_code（訪視編號，自動生成）
    village: string                 // 村名（從地址自動判讀，可手動修正）
    visitDate: string               // 紀錄日期（從 UUID7 時間戳記提取）
    victimName: string              // 受災鄉親姓名（從個資主檔帶入）
    contactAddress: string          // 聯絡地址（從個資主檔帶入）
    interviewees: Interviewee[]     // 受訪視者列表（可多人，預設帶入戶長）
  }
  household: {
    specialNotes: string[]          // 家戶特殊註記（多選）
    followUpNeeds: string[]         // 後續需求項目（多選）
    welfareStatus: string           // 福利身分
  }
  status: {
    isReceived: boolean             // 是否完成領取（預設 true）
    isDonatedBack: boolean          // 是否回捐
    isReported: boolean             // 是否轉提報
  }
  visit: {
    notes?: string                  // 訪視互動情形紀錄
    interactionPhotos: string[]     // 互動照片 URLs（多張）
    otherPhotos: string[]           // 其他佐證照片 URLs（選填、多張）
  }
  receipt: {
    amount: number                  // 發放金額（預設值可設定）
    receiptDate: string             // 簽領日期（從 UUID7 時間戳記提取，可修改）
    signature: string               // 電子簽名 Data URL
  }
}

/**
 * 訪視紀錄完整資料結構（資料庫記錄）
 */
export interface VisitRecord {
  id: string
  application_id: string            // 關聯個資主檔 UUID
  visit_code: string                // 訪視編號: {UUID7}B{村代碼}{流水號}
  user_id: string
  visit_data: VisitRecordData
  created_at: string
  updated_at: string
}

/**
 * 待訪視案件（步驟 0 列表使用）
 */
export interface PendingVisitCase {
  application_id: string
  victim_name: string               // 申請人姓名
  application_number: string        // 申請編號（從 application_data 提取）
  address: string                   // 地址
  created_at: string
}

/**
 * 生成訪視編號
 * 格式: {主檔UUID7}B{村代碼}{流水號}
 * 範例: 01234567-89ab-cdef-0123-456789abcdefBA0001
 *
 * @param applicationId - 個資主檔 UUID7
 * @param village - 村名
 * @param sequenceNumber - 同村流水號（4位數）
 */
export function generateVisitCode(
  applicationId: string,
  village: string,
  sequenceNumber: number
): string {
  const villageCode = VILLAGE_CODE_MAP[village] || 'O'
  const seq = sequenceNumber.toString().padStart(4, '0')
  return `${applicationId}B${villageCode}${seq}`
}

/**
 * 受訪視者資料
 */
export interface Interviewee {
  name: string                      // 姓名
  relationship: string              // 關係：戶長/配偶/子女/父母/其他
}

/**
 * 受訪視者關係選項
 */
export const INTERVIEWEE_RELATIONSHIP_OPTIONS = [
  '戶長',
  '配偶',
  '子女',
  '父母',
  '其他親屬',
  '鄰居',
  '村里長',
  '其他'
] as const

/**
 * 從訪視編號解析村代碼和流水號
 *
 * @param visitCode - 訪視編號
 * @returns { applicationId, villageCode, sequenceNumber }
 */
export function parseVisitCode(visitCode: string): {
  applicationId: string
  villageCode: string
  sequenceNumber: number
} | null {
  // 格式: {36字元UUID}B{1字元村代碼}{4位數流水號}
  const regex = /^([0-9a-f-]{36})B([A-Z])(\d{4})$/i
  const match = visitCode.match(regex)

  if (!match) return null

  return {
    applicationId: match[1],
    villageCode: match[2],
    sequenceNumber: parseInt(match[3], 10)
  }
}

/**
 * 從 UUID7 提取時間戳記
 * UUID7 格式：前48位是毫秒級時間戳記
 *
 * @param uuid7 - UUID7 字串
 * @returns ISO 日期字串 (YYYY-MM-DD)
 */
export function extractDateFromUUID7(uuid7: string): string {
  try {
    // 移除連字符並取前12個十六進位字元（48位）
    const hex = uuid7.replace(/-/g, '').substring(0, 12)

    // 轉換為毫秒時間戳記
    const timestamp = parseInt(hex, 16)

    // 轉換為日期並格式化為 YYYY-MM-DD
    const date = new Date(timestamp)
    return date.toISOString().split('T')[0]
  } catch (error) {
    // 如果解析失敗，返回今天日期
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * 計算下一個流水號
 *
 * @param existingCodes - 已存在的同村訪視編號列表
 * @param village - 村名
 */
export function getNextSequenceNumber(
  existingCodes: string[],
  village: string
): number {
  const villageCode = VILLAGE_CODE_MAP[village] || 'O'

  // 過濾出同村的編號
  const sameVillageNumbers = existingCodes
    .map(parseVisitCode)
    .filter(parsed => parsed && parsed.villageCode === villageCode)
    .map(parsed => parsed!.sequenceNumber)

  if (sameVillageNumbers.length === 0) {
    return 1
  }

  return Math.max(...sameVillageNumbers) + 1
}

/**
 * 從地址自動判讀村名
 *
 * @param address - 聯絡地址
 * @returns 村名，如無法判讀則返回 '其他'
 */
export function detectVillageFromAddress(address: string): string {
  if (!address) return '其他'

  // 按照村名關鍵字進行判讀
  for (const village of VILLAGE_OPTIONS) {
    if (village !== '其他' && address.includes(village)) {
      return village
    }
  }

  return '其他'
}
