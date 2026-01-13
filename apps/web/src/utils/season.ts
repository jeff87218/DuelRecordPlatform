// 計算當前賽季代碼
// 遊戲王每季對應每個月，例如：
// 2026年1月 = S49
// 2025年12月 = S48
// 基準點：2024年8月 = S32

const BASE_YEAR = 2024
const BASE_MONTH = 8 // 1-12
const BASE_SEASON = 32

function parseSeasonNumber(seasonCode: string): number | null {
  const match = /^S(\d+)$/i.exec(seasonCode.trim())
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}

function formatDateYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addMonths(year: number, month1to12: number, deltaMonths: number): { year: number; month: number } {
  const totalMonths = year * 12 + (month1to12 - 1) + deltaMonths
  const newYear = Math.floor(totalMonths / 12)
  const newMonth = (totalMonths % 12) + 1
  return { year: newYear, month: newMonth }
}

export function getSeasonInfo(seasonCode: string): {
  code: string
  seasonNumber: number
  year: number
  month: number
  start: string
  end: string
} | null {
  const seasonNumber = parseSeasonNumber(seasonCode)
  if (seasonNumber == null) return null

  const monthsDiff = seasonNumber - BASE_SEASON
  const { year, month } = addMonths(BASE_YEAR, BASE_MONTH, monthsDiff)

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  return {
    code: `S${seasonNumber}`,
    seasonNumber,
    year,
    month,
    start: formatDateYMD(startDate),
    end: formatDateYMD(endDate),
  }
}

export function getRecentSeasonCodes(count: number, fromSeasonCode?: string): string[] {
  const baseCode = fromSeasonCode ?? getCurrentSeasonCode()
  const seasonNumber = parseSeasonNumber(baseCode)
  if (seasonNumber == null || count <= 0) return []
  return Array.from({ length: count }, (_, i) => `S${seasonNumber - i}`)
}

export function getCurrentSeasonCode(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12
  
  // 計算距離 2024年8月 有多少個月
  const monthsDiff = (year - BASE_YEAR) * 12 + (month - BASE_MONTH)
  const seasonNumber = BASE_SEASON + monthsDiff
  
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

  const monthsDiff = (year - BASE_YEAR) * 12 + (month - BASE_MONTH)
  const seasonNumber = BASE_SEASON + monthsDiff
  
  return `S${seasonNumber}`
}
