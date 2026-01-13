import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matchesService } from '../services/matchesService'
import { decksService, THEME_COLORS, type DeckTheme } from '../services/decksService'
import { useTheme } from '../contexts/ThemeContext'
import MatchForm from '../components/MatchForm'
import type { Match } from '../types/match'
import { getCurrentSeasonCode, getRecentSeasonCodes, getSeasonInfo } from '../utils/season'
import ReactECharts from 'echarts-for-react'
import { buildSeasonStats } from '../utils/stats'

// 視圖模式
type ViewMode = 'both' | 'stats' | 'records'

// 根據階級返回對應顏色 (深色/淺色模式)
function getRankColor(rank: string, isDark: boolean): string {
  if (rank.startsWith('銅')) {
    return isDark 
      ? 'bg-amber-700/30 text-amber-500' 
      : 'bg-amber-700/20 text-amber-800 border border-amber-600'
  }
  if (rank.startsWith('銀')) {
    return isDark 
      ? 'bg-gray-400/20 text-gray-300' 
      : 'bg-gray-200 text-gray-700 border border-gray-400'
  }
  if (rank.startsWith('金')) {
    return isDark 
      ? 'bg-yellow-500/20 text-yellow-400' 
      : 'bg-yellow-100 text-yellow-700 border border-yellow-400'
  }
  if (rank.startsWith('白金')) {
    return isDark 
      ? 'bg-cyan-500/20 text-cyan-300' 
      : 'bg-cyan-100 text-cyan-700 border border-cyan-400'
  }
  if (rank.startsWith('鑽石')) {
    return isDark 
      ? 'bg-pink-500/20 text-pink-400' 
      : 'bg-pink-100 text-pink-700 border border-pink-400'
  }
  if (rank.startsWith('大師')) {
    return isDark 
      ? 'bg-orange-500/20 text-orange-400' 
      : 'bg-orange-100 text-orange-700 border border-orange-400'
  }
  return isDark 
    ? 'bg-gray-500/20 text-gray-400' 
    : 'bg-gray-100 text-gray-600 border border-gray-300'
}

export default function SeasonMatchesPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [viewMode, setViewMode] = useState<ViewMode>('records')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // 取得當前賽季資訊
  const currentSeason = getCurrentSeasonCode() // e.g. S49
  const [selectedSeason, setSelectedSeason] = useState(currentSeason)

  const seasonOptions = useMemo(() => {
    const codes = getRecentSeasonCodes(12, currentSeason)
    return codes.map(code => {
      const info = getSeasonInfo(code)
      const ym = info ? `${info.year}/${String(info.month).padStart(2, '0')}` : ''
      return {
        code,
        label: ym ? `${code} (${ym})` : code,
        info,
      }
    })
  }, [currentSeason])

  const selectedSeasonInfo = useMemo(() => getSeasonInfo(selectedSeason), [selectedSeason])

  type StatsFilters = {
    myDeckMain?: string
    oppDeckMain?: string
    dateFrom?: string
    dateTo?: string
  }

  const [statsFilters, setStatsFilters] = useState<StatsFilters>({})

  useEffect(() => {
    setStatsFilters({})
  }, [selectedSeason])

  // 只查詢當季資料（使用 seasonCode 篩選）
  const { data, isLoading, error } = useQuery({
    queryKey: ['matches', 'season', selectedSeason],
    queryFn: () => matchesService.getMatches({ seasonCode: selectedSeason }),
  })

  // 取得牌組模板資料
  const { data: deckTemplatesData } = useQuery({
    queryKey: ['deck-templates'],
    queryFn: () => decksService.getTemplates(),
  })

  // 建立牌組名稱 -> 主題顏色的映射
  const deckColorMap = useMemo(() => {
    const map: Record<string, { bg: string; text: string }> = {}
    if (deckTemplatesData?.templates) {
      for (const template of deckTemplatesData.templates) {
        const colors = THEME_COLORS[template.theme as DeckTheme] || THEME_COLORS['無']
        map[template.name] = colors
      }
    }
    return map
  }, [deckTemplatesData])

  // 取得牌組顏色
  const getDeckColor = (deckName: string) => {
    return deckColorMap[deckName] || THEME_COLORS['無']
  }

  // 刪除 mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => matchesService.deleteMatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setDeleteConfirmId(null)
    },
  })

  const baseMatches = data?.matches ?? []

  const filteredMatches = useMemo(() => {
    const { myDeckMain, oppDeckMain, dateFrom, dateTo } = statsFilters
    return baseMatches.filter(m => {
      if (myDeckMain && m.myDeck.main !== myDeckMain) return false
      if (oppDeckMain && m.oppDeck.main !== oppDeckMain) return false

      const day = m.date.includes('T') ? m.date.split('T')[0] : m.date
      if (dateFrom && day < dateFrom) return false
      if (dateTo && day > dateTo) return false
      return true
    })
  }, [baseMatches, statsFilters])

  const stats = useMemo(
    () => buildSeasonStats(filteredMatches, selectedSeasonInfo ? { start: selectedSeasonInfo.start, end: selectedSeasonInfo.end } : undefined),
    [filteredMatches, selectedSeasonInfo],
  )

  const total = stats.total
  const wins = stats.wins
  const losses = stats.losses
  const firstRate = stats.firstRate
  const firstCount = stats.firstCount
  const secondCount = stats.secondCount
  const firstWinRate = stats.firstWinRate
  const secondWinRate = stats.secondWinRate
  const firstWins = stats.firstWins
  const secondWins = stats.secondWins

  // Container 樣式
  const containerClass = `rounded-2xl p-6 ${
    isDark
      ? 'bg-[#16161c] border border-[#2a2a35]'
      : 'bg-white border border-gray-200 shadow-sm'
  }`

  // 顯示編輯表單
  if (editingMatch) {
    return (
      <div className={containerClass}>
        <MatchForm
          onCancel={() => setEditingMatch(null)}
          onSuccess={() => setEditingMatch(null)}
          editMatch={editingMatch}
        />
      </div>
    )
  }

  // 顯示新增表單
  if (showAddForm) {
    // 取得最新一筆紀錄作為預設值
    const latestMatch = data?.matches[0]
    const defaultValues = latestMatch ? {
      date: latestMatch.date.split('T')[0],
      rank: latestMatch.rank,
      myDeckMain: latestMatch.myDeck.main,
      myDeckSub: latestMatch.myDeck.sub || '無',
    } : {
      date: selectedSeasonInfo?.start || new Date().toISOString().split('T')[0],
      rank: '金 V',
      myDeckMain: '',
      myDeckSub: '無',
    }
    
    return (
      <div className={containerClass}>
        <MatchForm
          onCancel={() => setShowAddForm(false)}
          onSuccess={() => setShowAddForm(false)}
          defaultValues={defaultValues}
          seasonCode={selectedSeason}
        />
      </div>
    )
  }

  // 視圖切換按鈕
  const ViewToggle = () => (
    <div className={`inline-flex rounded-lg p-1 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
      <button
        onClick={() => setViewMode('stats')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          viewMode === 'stats'
            ? 'bg-indigo-600 text-white'
            : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        統計
      </button>
      <button
        onClick={() => setViewMode('both')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          viewMode === 'both'
            ? 'bg-indigo-600 text-white'
            : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        並排
      </button>
      <button
        onClick={() => setViewMode('records')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          viewMode === 'records'
            ? 'bg-indigo-600 text-white'
            : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        記錄
      </button>
    </div>
  )

  // 統計視覺化 Container
  const StatsContainer = () => (
    <div className={`${containerClass} ${viewMode === 'both' ? 'h-[calc(100vh-140px)] overflow-y-auto' : 'min-h-[calc(100vh-140px)]'}`}>
      <h2 className="text-xl font-bold mb-4">當季統計</h2>

      {/* 篩選條件 chips */}
      {(statsFilters.myDeckMain || statsFilters.oppDeckMain || statsFilters.dateFrom || statsFilters.dateTo) && (
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {statsFilters.myDeckMain && (
              <button
                type="button"
                onClick={() => setStatsFilters(f => ({ ...f, myDeckMain: undefined }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  isDark ? 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                }`}
              >
                我方：{statsFilters.myDeckMain} ×
              </button>
            )}
            {statsFilters.oppDeckMain && (
              <button
                type="button"
                onClick={() => setStatsFilters(f => ({ ...f, oppDeckMain: undefined }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  isDark ? 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                }`}
              >
                對手：{statsFilters.oppDeckMain} ×
              </button>
            )}
            {(statsFilters.dateFrom || statsFilters.dateTo) && (
              <button
                type="button"
                onClick={() => setStatsFilters(f => ({ ...f, dateFrom: undefined, dateTo: undefined }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  isDark ? 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                }`}
              >
                日期：{statsFilters.dateFrom ?? '...'} ~ {statsFilters.dateTo ?? '...'} ×
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStatsFilters({})}
            className={`text-sm font-semibold transition-colors ${isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-700 hover:text-indigo-800'}`}
          >
            清除篩選
          </button>
        </div>
      )}
      
      {/* 總覽統計 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className={`text-xs uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>總場數</div>
          <div className="text-3xl font-bold">{total}</div>
        </div>
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className={`text-xs uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>總勝率</div>
          <div className="text-3xl font-bold text-blue-500">
            {total > 0 ? ((wins / total) * 100).toFixed(1) : 0}%
          </div>
          <div className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {wins}W-{losses}L
          </div>
        </div>
      </div>

      {/* 先後攻統計 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className={`text-xs uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>先攻率</div>
          <div className="text-2xl font-bold text-cyan-500">{firstRate.toFixed(1)}%</div>
          <div className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {firstCount}-{secondCount}
          </div>
        </div>
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className={`text-xs uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>先攻勝率</div>
          <div className="text-2xl font-bold text-green-500">{firstWinRate.toFixed(1)}%</div>
          <div className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {firstWins}W-{firstCount - firstWins}L
          </div>
        </div>
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className={`text-xs uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>後攻勝率</div>
          <div className="text-2xl font-bold text-orange-500">{secondWinRate.toFixed(1)}%</div>
          <div className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {secondWins}W-{secondCount - secondWins}L
          </div>
        </div>
      </div>

      {/* 圖表 + 表格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 對手牌組分布（圓餅） */}
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>對手牌組分布</div>
              <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>點擊切換篩選</div>
            </div>
            {statsFilters.oppDeckMain && (
              <button
                type="button"
                onClick={() => setStatsFilters(f => ({ ...f, oppDeckMain: undefined }))}
                className={`text-sm font-semibold transition-colors ${isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-700 hover:text-indigo-800'}`}
              >
                重置
              </button>
            )}
          </div>
          <ReactECharts
            style={{ height: 320 }}
            option={{
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'item',
                formatter: (p: any) => `${p.name}<br/>場數：${p.value}（${p.percent}%）`,
              },
              series: [
                {
                  type: 'pie',
                  radius: ['35%', '70%'],
                  avoidLabelOverlap: true,
                  itemStyle: {
                    borderRadius: 8,
                    borderColor: isDark ? '#16161c' : '#ffffff',
                    borderWidth: 2,
                    opacity: 0.95,
                  },
                  label: { show: false },
                  emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
                  data: stats.oppDecks.slice(0, 10).map(d => ({ name: d.name, value: d.games })),
                },
              ],
            }}
            onEvents={{
              click: (p: any) => {
                const name = String(p?.name ?? '')
                if (!name) return
                setStatsFilters(f => ({
                  ...f,
                  oppDeckMain: f.oppDeckMain === name ? undefined : name,
                }))
              },
            }}
          />
          <div className={`mt-3 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            只顯示前 10 名（依場數排序）
          </div>
        </div>

        {/* 每日勝率（雙軸：場數/勝率） */}
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>每日勝率</div>
              <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>拖曳縮放以篩選日期</div>
            </div>
            {(statsFilters.dateFrom || statsFilters.dateTo) && (
              <button
                type="button"
                onClick={() => setStatsFilters(f => ({ ...f, dateFrom: undefined, dateTo: undefined }))}
                className={`text-sm font-semibold transition-colors ${isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-700 hover:text-indigo-800'}`}
              >
                重置
              </button>
            )}
          </div>
          <ReactECharts
            style={{ height: 320 }}
            option={{
              backgroundColor: 'transparent',
              grid: { left: 44, right: 48, top: 32, bottom: 54 },
              tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (items: any) => {
                  const it = Array.isArray(items) ? items : []
                  const date = it[0]?.axisValue ?? ''
                  const games = it.find((x: any) => x.seriesName === '場數')?.data ?? 0
                  const rate = it.find((x: any) => x.seriesName === '勝率')?.data
                  const rateText = rate == null ? '-' : `${Number(rate).toFixed(1)}%`
                  return `${date}<br/>場數：${games}<br/>勝率：${rateText}`
                },
              },
              xAxis: {
                type: 'category',
                data: stats.daily.map(d => d.date),
                axisLabel: { color: isDark ? '#9ca3af' : '#6b7280', formatter: (v: string) => v.slice(5) },
                axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' } },
              },
              yAxis: [
                {
                  type: 'value',
                  name: '場數',
                  nameTextStyle: { color: isDark ? '#9ca3af' : '#6b7280' },
                  axisLabel: { color: isDark ? '#9ca3af' : '#6b7280' },
                  splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } },
                },
                {
                  type: 'value',
                  name: '勝率',
                  min: 0,
                  max: 100,
                  nameTextStyle: { color: isDark ? '#9ca3af' : '#6b7280' },
                  axisLabel: { color: isDark ? '#9ca3af' : '#6b7280', formatter: '{value}%' },
                  splitLine: { show: false },
                },
              ],
              dataZoom: [
                {
                  type: 'inside',
                  realtime: false,
                  startValue: statsFilters.dateFrom
                    ? Math.max(0, stats.daily.findIndex(d => d.date === statsFilters.dateFrom))
                    : undefined,
                  endValue: statsFilters.dateTo
                    ? Math.max(0, stats.daily.findIndex(d => d.date === statsFilters.dateTo))
                    : undefined,
                },
                {
                  type: 'slider',
                  realtime: false,
                  height: 18,
                  startValue: statsFilters.dateFrom
                    ? Math.max(0, stats.daily.findIndex(d => d.date === statsFilters.dateFrom))
                    : undefined,
                  endValue: statsFilters.dateTo
                    ? Math.max(0, stats.daily.findIndex(d => d.date === statsFilters.dateTo))
                    : undefined,
                },
              ],
              series: [
                {
                  name: '場數',
                  type: 'bar',
                  yAxisIndex: 0,
                  data: stats.daily.map(d => d.games),
                  itemStyle: { color: isDark ? 'rgba(99,102,241,0.55)' : 'rgba(99,102,241,0.35)', borderRadius: [4, 4, 0, 0] },
                },
                {
                  name: '勝率',
                  type: 'line',
                  yAxisIndex: 1,
                  data: stats.daily.map(d => (d.winRate == null ? null : Number(d.winRate.toFixed(2)))),
                  smooth: true,
                  symbolSize: 6,
                  lineStyle: { width: 3, color: isDark ? '#22c55e' : '#16a34a' },
                  itemStyle: { color: isDark ? '#22c55e' : '#16a34a' },
                },
              ],
            }}
            onEvents={{
              datazoom: (p: any) => {
                const batch = Array.isArray(p?.batch) ? p.batch[0] : null
                const startValue = batch?.startValue
                const endValue = batch?.endValue
                const axis = stats.daily.map(d => d.date)

                const start = typeof startValue === 'number' ? axis[startValue] : startValue
                const end = typeof endValue === 'number' ? axis[endValue] : endValue

                if (typeof start === 'string' && typeof end === 'string') {
                  setStatsFilters(f => ({ ...f, dateFrom: start, dateTo: end }))
                }
              },
              click: (p: any) => {
                const date = String(p?.name ?? '')
                if (!date) return
                setStatsFilters(f => ({ ...f, dateFrom: date, dateTo: date }))
              },
            }}
          />
        </div>
      </div>

      {/* 我方常用牌組（點擊篩選） */}
      <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-[#1e1e26]' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>我方常用牌組</div>
            <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>點擊列以篩選</div>
          </div>
          {statsFilters.myDeckMain && (
            <button
              type="button"
              onClick={() => setStatsFilters(f => ({ ...f, myDeckMain: undefined }))}
              className={`text-sm font-semibold transition-colors ${isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-700 hover:text-indigo-800'}`}
            >
              重置
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full">
            <thead className={isDark ? 'border-b border-white/10' : 'border-b border-gray-200 bg-gray-50'}>
              <tr>
                <th className={`px-4 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>牌組</th>
                <th className={`px-4 py-2 text-right text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>場數</th>
                <th className={`px-4 py-2 text-right text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>勝率</th>
              </tr>
            </thead>
            <tbody>
              {stats.myDecks.slice(0, 20).map((row, idx) => {
                const selected = statsFilters.myDeckMain === row.name
                return (
                  <tr
                    key={row.name}
                    onClick={() => setStatsFilters(f => ({ ...f, myDeckMain: f.myDeckMain === row.name ? undefined : row.name }))}
                    className={`cursor-pointer transition-colors ${
                      isDark
                        ? `border-b border-white/5 hover:bg-white/5 ${selected ? 'bg-indigo-500/15' : idx % 2 === 1 ? 'bg-white/[0.02]' : ''}`
                        : `border-b border-gray-100 hover:bg-gray-50 ${selected ? 'bg-indigo-50' : idx % 2 === 1 ? 'bg-gray-50/50' : ''}`
                    }`}
                  >
                    <td className={`px-4 py-2 text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{row.name}</td>
                    <td className={`px-4 py-2 text-sm text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{row.games}</td>
                    <td className={`px-4 py-2 text-sm text-right font-bold ${row.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                      {row.winRate.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className={`px-4 py-3 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          只顯示前 20 名（依場數排序）
        </div>
      </div>
    </div>
  )

  // 對局記錄 Container
  const RecordsContainer = () => (
    <div className={`${containerClass} ${viewMode === 'both' ? 'h-[calc(100vh-140px)]' : 'h-[calc(100vh-140px)]'} flex flex-col overflow-hidden`}>
      {/* 固定區域：標題區 */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1">當季記錄</h2>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {selectedSeason} · Master Duel
            </p>
          </div>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            + 新增
          </button>
        </div>

        {/* 簡易統計（只在單獨顯示時出現） */}
        {viewMode === 'records' && (
          <div className="grid grid-cols-5 gap-3 mb-6">
            <div className={`rounded-xl p-3 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>總場數</div>
              <div className="text-lg font-bold">{total}</div>
            </div>
            <div className={`rounded-xl p-3 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>勝率</div>
              <div className="text-lg font-bold text-blue-500">
                {total > 0 ? ((wins / total) * 100).toFixed(1) : 0}%
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{wins}W-{losses}L</div>
            </div>
            <div className={`rounded-xl p-3 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>先攻率</div>
              <div className="text-lg font-bold text-cyan-500">{firstRate.toFixed(1)}%</div>
              <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{firstCount}-{secondCount}</div>
            </div>
            <div className={`rounded-xl p-3 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>先攻勝率</div>
              <div className="text-lg font-bold text-green-500">{firstWinRate.toFixed(1)}%</div>
              <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{firstWins}W-{firstCount - firstWins}L</div>
            </div>
            <div className={`rounded-xl p-3 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>後攻勝率</div>
              <div className="text-lg font-bold text-orange-500">{secondWinRate.toFixed(1)}%</div>
              <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{secondWins}W-{secondCount - secondWins}L</div>
            </div>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-4 text-red-400 text-sm">
            無法載入資料，請確認後端伺服器正常運行
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* 表格區域 */}
      {data && filteredMatches.length > 0 && (
        <div className={`flex-1 flex flex-col rounded-xl overflow-hidden ${
          isDark ? 'bg-[#1e1e26]' : 'bg-white border border-gray-200'
        }`}>
          {/* 固定表頭 */}
          <div className="flex-shrink-0">
            <table className="w-full table-fixed">
              <thead>
                <tr className={isDark ? 'border-b border-white/10' : 'border-b border-gray-200 bg-gray-50'}>
                  <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[65px]`}>日期</th>
                  <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[75px]`}>階級</th>
                  <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>我方</th>
                  <th className={`px-3 py-2 text-center text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[70px]`}>先/後</th>
                  <th className={`px-3 py-2 text-center text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[55px]`}>結果</th>
                  <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>對手</th>
                  {viewMode !== 'both' && (
                    <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[120px]`}>備註</th>
                  )}
                  <th className="px-3 py-2 w-[60px]"></th>
                </tr>
              </thead>
            </table>
          </div>
          
          {/* 可滾動的表格內容 */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[65px]" />
                <col className="w-[75px]" />
                <col />
                <col className="w-[70px]" />
                <col className="w-[55px]" />
                <col />
                {viewMode !== 'both' && <col className="w-[120px]" />}
                <col className="w-[60px]" />
              </colgroup>
              <tbody>
                {filteredMatches.map((match, index) => (
                  <tr 
                    key={match.id} 
                    className={`group transition-colors ${
                      isDark 
                        ? `border-b border-white/5 hover:bg-white/5 ${index % 2 === 1 ? 'bg-white/[0.02]' : ''}`
                        : `border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 1 ? 'bg-gray-50/50' : ''}`
                    }`}
                  >
                    <td className={`px-3 py-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {new Date(match.date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap ${getRankColor(match.rank, isDark)}`}>
                        {match.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded whitespace-nowrap ${getDeckColor(match.myDeck.main).bg} ${getDeckColor(match.myDeck.main).text}`}>
                          {match.myDeck.main}
                        </span>
                        {match.myDeck.sub && match.myDeck.sub !== '無' && (
                          <span className={`px-2 py-0.5 text-xs font-bold rounded whitespace-nowrap ${getDeckColor(match.myDeck.sub).bg} ${getDeckColor(match.myDeck.sub).text}`}>
                            {match.myDeck.sub}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap ${
                        match.playOrder === '先攻'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {match.playOrder}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        match.result === 'W'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {match.result}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded whitespace-nowrap ${getDeckColor(match.oppDeck.main).bg} ${getDeckColor(match.oppDeck.main).text}`}>
                          {match.oppDeck.main}
                        </span>
                        {match.oppDeck.sub && match.oppDeck.sub !== '無' && (
                          <span className={`px-2 py-0.5 text-xs font-bold rounded whitespace-nowrap ${getDeckColor(match.oppDeck.sub).bg} ${getDeckColor(match.oppDeck.sub).text}`}>
                            {match.oppDeck.sub}
                          </span>
                        )}
                      </div>
                    </td>
                    {viewMode !== 'both' && (
                      <td className="px-3 py-2">
                        <span className={`text-xs truncate block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {match.note || '-'}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingMatch(match)}
                          className={`p-1 rounded transition-colors ${
                            isDark 
                              ? 'text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                              : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(match.id)}
                          className={`p-1 rounded transition-colors ${
                            isDark
                              ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 空狀態 */}
      {data && filteredMatches.length === 0 && (
        <div className={`rounded-xl p-12 text-center ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50'}`}>
          <div className="text-4xl mb-4">🎮</div>
          <p className="text-gray-500 mb-4">目前篩選條件下沒有對局記錄</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            新增第一場對局
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* 頂部工具列 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">當季記錄</h1>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:border-indigo-500 ${
              isDark
                ? 'bg-[#1e1e26] border-white/10 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {seasonOptions.map(opt => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
          {selectedSeasonInfo && (
            <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {selectedSeasonInfo.start} ~ {selectedSeasonInfo.end}
            </span>
          )}
        </div>
        <ViewToggle />
      </div>

      {/* Container 區域 */}
      <div className={`flex gap-6 ${viewMode === 'both' ? '' : ''}`}>
        {/* 統計 Container */}
        {(viewMode === 'stats' || viewMode === 'both') && (
          <div className={viewMode === 'both' ? 'w-1/2' : 'w-full'}>
            <StatsContainer />
          </div>
        )}

        {/* 對局記錄 Container */}
        {(viewMode === 'records' || viewMode === 'both') && (
          <div className={viewMode === 'both' ? 'w-1/2' : 'w-full'}>
            <RecordsContainer />
          </div>
        )}
      </div>

      {/* 刪除確認對話框 */}
      {deleteConfirmId && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div 
            className={`w-full max-w-sm rounded-2xl p-6 ${
              isDark ? 'bg-[#1e1e26] border border-white/10' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">確認刪除</h3>
            <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              確定要刪除這筆對局記錄嗎？此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  isDark 
                    ? 'bg-white/10 hover:bg-white/20' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                取消
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
