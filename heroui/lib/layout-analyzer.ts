/**
 * 戶口名簿佈局分析子系統
 *
 * 獨立模組，可透過 config/ocr-config.json 控制啟用
 */

import ocrConfig from '@/config/ocr-config.json'
import standardLayout from '@/config/household-layout.json'

export interface LayoutRegion {
  type: string
  index: number
  yStart: number
  yEnd: number
  description: string
}

export interface LayoutAnalysisResult {
  regions: LayoutRegion[]
  totalRows: number
  hasTableBorders: boolean
  source: 'standard' | 'dynamic' | 'user-adjusted'
  analysisTime?: number
}

export type LayoutAnalysisMode = 'standard' | 'dynamic' | 'preview'

/**
 * 佈局分析器類別
 */
export class LayoutAnalyzer {
  private mode: LayoutAnalysisMode
  private enabled: boolean

  constructor() {
    this.enabled = ocrConfig.layoutAnalysis.enabled
    this.mode = ocrConfig.layoutAnalysis.mode as LayoutAnalysisMode
  }

  /**
   * 檢查佈局分析是否已啟用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 取得當前模式
   */
  getMode(): LayoutAnalysisMode {
    return this.mode
  }

  /**
   * 取得標準佈局配置
   */
  getStandardLayout(): LayoutAnalysisResult {
    return {
      regions: standardLayout.regions as LayoutRegion[],
      totalRows: standardLayout.totalRows,
      hasTableBorders: standardLayout.hasTableBorders,
      source: 'standard'
    }
  }

  /**
   * 執行佈局分析（根據配置模式）
   *
   * @param imageFile - 戶口名簿圖片
   * @returns 佈局分析結果
   */
  async analyze(imageFile: File): Promise<LayoutAnalysisResult> {
    // 如果未啟用或使用標準模式，直接返回標準配置
    if (!this.enabled || this.mode === 'standard') {
      console.log('📐 使用標準佈局配置')
      return this.getStandardLayout()
    }

    // dynamic 或 preview 模式：調用 Vision LLM 分析
    if (this.mode === 'dynamic' || this.mode === 'preview') {
      console.log('📐 開始動態佈局分析...')
      const startTime = Date.now()

      try {
        const formData = new FormData()
        formData.append('image', imageFile)
        formData.append('type', 'household-layout')

        const response = await fetch('/api/ocr', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          console.warn('⚠️ 動態佈局分析失敗，回退到標準配置')
          return this.getStandardLayout()
        }

        const result = await response.json()
        const analysisTime = Date.now() - startTime

        if (result.success && result.data?.regions) {
          console.log(`✅ 動態佈局分析完成 (${(analysisTime / 1000).toFixed(1)}秒)`)
          return {
            regions: result.data.regions,
            totalRows: result.data.totalRows || 7,
            hasTableBorders: result.data.hasTableBorders || true,
            source: 'dynamic',
            analysisTime
          }
        } else {
          console.warn('⚠️ 佈局分析結果無效，回退到標準配置')
          return this.getStandardLayout()
        }
      } catch (error) {
        console.error('❌ 佈局分析錯誤:', error)
        console.log('📐 回退到標準配置')
        return this.getStandardLayout()
      }
    }

    // 預設返回標準配置
    return this.getStandardLayout()
  }

  /**
   * 驗證佈局區域的有效性
   */
  validateRegions(regions: LayoutRegion[]): boolean {
    if (!regions || regions.length === 0) return false

    for (let i = 0; i < regions.length; i++) {
      const region = regions[i]

      // 檢查必要欄位
      if (typeof region.yStart !== 'number' || typeof region.yEnd !== 'number') {
        return false
      }

      // 檢查範圍
      if (region.yStart < 0 || region.yStart > 1 || region.yEnd < 0 || region.yEnd > 1) {
        return false
      }

      // 檢查順序
      if (region.yStart >= region.yEnd) {
        return false
      }

      // 檢查連續性（下一個區域應該從上一個區域結束）
      if (i > 0 && Math.abs(regions[i - 1].yEnd - region.yStart) > 0.01) {
        console.warn(`⚠️ 區域 ${i} 與前一區域不連續`)
      }
    }

    return true
  }

  /**
   * 應用使用者調整的佈局
   */
  applyUserAdjustment(adjustedRegions: LayoutRegion[]): LayoutAnalysisResult {
    if (!this.validateRegions(adjustedRegions)) {
      console.error('❌ 使用者調整的區域無效，使用原始配置')
      return this.getStandardLayout()
    }

    return {
      regions: adjustedRegions,
      totalRows: adjustedRegions.length,
      hasTableBorders: true,
      source: 'user-adjusted'
    }
  }
}

/**
 * 單例模式：全域佈局分析器實例
 */
let analyzerInstance: LayoutAnalyzer | null = null

export function getLayoutAnalyzer(): LayoutAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new LayoutAnalyzer()
  }
  return analyzerInstance
}

/**
 * 便捷方法：直接分析佈局
 */
export async function analyzeLayout(imageFile: File): Promise<LayoutAnalysisResult> {
  const analyzer = getLayoutAnalyzer()
  return analyzer.analyze(imageFile)
}

/**
 * 便捷方法：取得標準佈局
 */
export function getStandardLayout(): LayoutAnalysisResult {
  const analyzer = getLayoutAnalyzer()
  return analyzer.getStandardLayout()
}
