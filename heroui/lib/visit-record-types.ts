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
    kavaKashaCode: string          // 華加沙編碼（必填、唯一）
    village: string                 // 村名（必填）
    visitDate: string               // 紀錄日期 YYYY-MM-DD（必填）
    victimName?: string             // 受災鄉親姓名
    contactAddress?: string         // 聯絡地址
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
  documents: {
    idFrontPhoto?: string           // 身分證正面照 URL
    idBackPhoto?: string            // 身分證背面照 URL（選填）
    householdTranscript?: string    // 戶籍謄本 URL（選填）
  }
  visit: {
    notes?: string                  // 訪視互動情形紀錄
    interactionPhotos: string[]     // 互動照片 URLs（多張）
    receiptPhoto?: string           // 簽收單據照片 URL
    otherPhotos: string[]           // 其他佐證照片 URLs（選填、多張）
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
  const samVillageNumbers = existingCodes
    .map(parseVisitCode)
    .filter(parsed => parsed && parsed.villageCode === villageCode)
    .map(parsed => parsed!.sequenceNumber)

  if (sameVillageNumbers.length === 0) {
    return 1
  }

  return Math.max(...sameVillageNumbers) + 1
}
