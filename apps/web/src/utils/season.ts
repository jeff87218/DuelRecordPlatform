// 計算當前賽季代碼
// 遊戲王每季對應每個月，例如：
// 2026年1月 = S49
// 2025年12月 = S48
// 基準點：2024年8月 = S32
export function getCurrentSeasonCode(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12
  
  // 計算距離 2024年8月 有多少個月
  const baseYear = 2024
  const baseMonth = 8
  const baseSeason = 32  // 修正：2024年8月 = S32
  
  const monthsDiff = (year - baseYear) * 12 + (month - baseMonth)
  const seasonNumber = baseSeason + monthsDiff
  
  return `S${seasonNumber}`
}

// 取得當前月份的開始和結束日期
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0) // 該月最後一天
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

// 根據日期計算賽季代碼
export function getSeasonCodeFromDate(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  
  const baseYear = 2024
  const baseMonth = 8
  const baseSeason = 32  // 修正：2024年8月 = S32
  
  const monthsDiff = (year - baseYear) * 12 + (month - baseMonth)
  const seasonNumber = baseSeason + monthsDiff
  
  return `S${seasonNumber}`
}
