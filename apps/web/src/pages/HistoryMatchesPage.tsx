import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { matchesService } from '../services/matchesService'
import { decksService, THEME_COLORS, type DeckTheme } from '../services/decksService'
import { useTheme } from '../contexts/ThemeContext'
import MatchForm from '../components/MatchForm'
import type { Match } from '../types/match'

// 視圖模式
type ViewMode = 'both' | 'stats' | 'records'

// 每行高度
const ROW_HEIGHT = 40

// 虛擬化表格組件
interface VirtualizedTableProps {
  matches: Match[]
  isDark: boolean
  viewMode: ViewMode
  getRankColor: (rank: string, isDark: boolean) => string
  getDeckColor: (deckName: string) => { bg: string; text: string }
  onEdit: (match: Match) => void
  onDelete: (id: string) => void
}

function VirtualizedTable({ 
  matches, 
  isDark, 
  viewMode, 
  getRankColor, 
  getDeckColor,
  onEdit,
  onDelete 
}: VirtualizedTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: matches.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // 多渲染 10 行緩衝
  })

  return (
    <div className={`flex-1 flex flex-col rounded-xl overflow-hidden ${
      isDark ? 'bg-[#1e1e26]' : 'bg-white border border-gray-200'
    }`}>
      {/* 固定表頭 */}
      <div className="flex-shrink-0">
        <table className="w-full table-fixed">
          <thead>
            <tr className={isDark ? 'border-b border-white/10' : 'border-b border-gray-200 bg-gray-50'}>
              <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[50px]`}>賽季</th>
              <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[65px]`}>日期</th>
              <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[75px]`}>階級</th>
              <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>我方</th>
              <th className={`px-3 py-2 text-center text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[60px]`}>先/後</th>
              <th className={`px-3 py-2 text-center text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[50px]`}>結果</th>
              <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>對手</th>
              {viewMode !== 'both' && (
                <th className={`px-3 py-2 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} w-[100px]`}>備註</th>
              )}
              <th className="px-3 py-2 w-[55px]"></th>
            </tr>
          </thead>
        </table>
      </div>
      
      {/* 虛擬滾動的表格內容 */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const match = matches[virtualRow.index]
            const index = virtualRow.index
            return (
              <div
                key={match.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div 
                  className={`flex items-center h-full group transition-colors ${
                    isDark 
                      ? `border-b border-white/5 hover:bg-white/5 ${index % 2 === 1 ? 'bg-white/[0.02]' : ''}`
                      : `border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 1 ? 'bg-gray-50/50' : ''}`
                  }`}
                >
                  {/* 賽季 */}
                  <div className={`px-3 text-xs font-medium w-[50px] ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {match.seasonCode}
                  </div>
                  {/* 日期 */}
                  <div className={`px-3 text-sm w-[65px] ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {new Date(match.date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })}
                  </div>
                  {/* 階級 */}
                  <div className="px-3 w-[75px]">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap ${getRankColor(match.rank, isDark)}`}>
                      {match.rank}
                    </span>
                  </div>
                  {/* 我方 */}
                  <div className="px-3 flex-1 min-w-0">
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
                  </div>
                  {/* 先/後 */}
                  <div className="px-3 text-center w-[60px]">
                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded whitespace-nowrap ${
                      match.playOrder === '先攻'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {match.playOrder === '先攻' ? '先' : '後'}
                    </span>
                  </div>
                  {/* 結果 */}
                  <div className="px-3 text-center w-[50px]">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      match.result === 'W'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}>
                      {match.result}
                    </span>
                  </div>
                  {/* 對手 */}
                  <div className="px-3 flex-1 min-w-0">
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
                  </div>
                  {/* 備註 */}
                  {viewMode !== 'both' && (
                    <div className="px-3 w-[100px]">
                      <span className={`text-xs truncate block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {match.note || '-'}
                      </span>
                    </div>
                  )}
                  {/* 操作 */}
                  <div className="px-3 text-center w-[55px]">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(match)}
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
                        onClick={() => onDelete(match.id)}
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
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

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

export default function HistoryMatchesPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [viewMode, setViewMode] = useState<ViewMode>('records')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // 查詢所有資料
  const { data, isLoading, error } = useQuery({
    queryKey: ['matches', 'all'],
    queryFn: () => matchesService.getMatches(),
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

  const wins = data?.matches.filter(m => m.result === 'W').length || 0
  const losses = data?.matches.filter(m => m.result === 'L').length || 0
  const total = data?.total || 0

  // 先後攻統計
  const firstMatches = data?.matches.filter(m => m.playOrder === '先攻') || []
  const secondMatches = data?.matches.filter(m => m.playOrder === '後攻') || []
  const firstCount = firstMatches.length
  const secondCount = secondMatches.length
  const firstWins = firstMatches.filter(m => m.result === 'W').length
  const secondWins = secondMatches.filter(m => m.result === 'W').length
  const firstRate = total > 0 ? (firstCount / total) * 100 : 0
  const firstWinRate = firstCount > 0 ? (firstWins / firstCount) * 100 : 0
  const secondWinRate = secondCount > 0 ? (secondWins / secondCount) * 100 : 0

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
      date: new Date().toISOString().split('T')[0],
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
      <h2 className="text-xl font-bold mb-4">歷史總統計</h2>
      
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

      {/* 圖表區域（暫時留空） */}
      <div className={`rounded-xl p-8 text-center ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="text-4xl mb-4">📊</div>
        <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          圖表功能開發中...
        </p>
        <p className={`text-sm mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          對手牌組分佈、每日勝率趨勢等
        </p>
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
            <h2 className="text-xl font-bold mb-1">歷史總記錄</h2>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              共 {total} 場對局 · Master Duel
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

      {/* 表格區域 - 包含賽季欄位 (虛擬滾動) */}
      {data && data.matches.length > 0 && (
        <VirtualizedTable 
          matches={data.matches}
          isDark={isDark}
          viewMode={viewMode}
          getRankColor={getRankColor}
          getDeckColor={getDeckColor}
          onEdit={setEditingMatch}
          onDelete={setDeleteConfirmId}
        />
      )}

      {/* 空狀態 */}
      {data && data.matches.length === 0 && (
        <div className={`rounded-xl p-12 text-center ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50'}`}>
          <div className="text-4xl mb-4">🎮</div>
          <p className="text-gray-500 mb-4">尚無對局記錄</p>
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
        <h1 className="text-2xl font-bold">歷史總記錄</h1>
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
