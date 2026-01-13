import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matchesService } from '../services/matchesService'
import { useTheme } from '../contexts/ThemeContext'
import MatchForm from '../components/MatchForm'
import type { Match } from '../types/match'

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

export default function MatchesPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchesService.getMatches(),
  })

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

  // 顯示編輯表單
  if (editingMatch) {
    return (
      <MatchForm
        onCancel={() => setEditingMatch(null)}
        onSuccess={() => setEditingMatch(null)}
        editMatch={editingMatch}
      />
    )
  }

  // 顯示新增表單
  if (showAddForm) {
    // 取得最新一筆記錄作為預設值
    const latestMatch = data?.matches[0]
    return (
      <MatchForm
        onCancel={() => setShowAddForm(false)}
        onSuccess={() => setShowAddForm(false)}
        defaultValues={latestMatch ? {
          date: latestMatch.date.split('T')[0],
          rank: latestMatch.rank,
          myDeckMain: latestMatch.myDeck.main,
          myDeckSub: latestMatch.myDeck.sub || '無',
        } : undefined}
      />
    )
  }

  return (
    <div>
      {/* 標題區 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">對局記錄</h1>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Season 48 · Master Duel
          </p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          + 新增對局
        </button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className={`text-sm mb-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>總場數</div>
          <div className="text-2xl font-bold">{total}</div>
        </div>
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className={`text-sm mb-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>勝場</div>
          <div className="text-2xl font-bold text-green-500">{wins}</div>
        </div>
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className={`text-sm mb-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>敗場</div>
          <div className="text-2xl font-bold text-red-500">{losses}</div>
        </div>
        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className={`text-sm mb-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>勝率</div>
          <div className="text-2xl font-bold text-blue-500">
            {total > 0 ? ((wins / total) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

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

      {/* 表格 */}
      {data && data.matches.length > 0 && (
        <div className={`rounded-xl overflow-hidden ${
          isDark ? 'bg-[#1e1e26]' : 'bg-white border border-gray-200'
        }`}>
          <table className="w-full">
            <thead>
              <tr className={isDark ? 'border-b border-white/10' : 'border-b border-gray-200 bg-gray-50'}>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>日期</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>階級</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>我方牌組</th>
                <th className={`px-4 py-3 text-center text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>先/後攻</th>
                <th className={`px-4 py-3 text-center text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>結果</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>對手牌組</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>備註</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {data.matches.map((match, index) => (
                <tr 
                  key={match.id} 
                  className={`group transition-colors ${
                    isDark 
                      ? `border-b border-white/5 hover:bg-white/5 ${index % 2 === 1 ? 'bg-white/[0.02]' : ''}`
                      : `border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 1 ? 'bg-gray-50/50' : ''}`
                  }`}
                >
                  {/* 日期 */}
                  <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {new Date(match.date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })}
                  </td>
                  {/* 階級 - 使用動態顏色 */}
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getRankColor(match.rank, isDark)}`}>
                      {match.rank}
                    </span>
                  </td>
                  {/* 我方牌組 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-sm font-bold rounded bg-blue-700 text-white">
                        {match.myDeck.main}
                      </span>
                      {match.myDeck.sub && match.myDeck.sub !== '無' && (
                        <span className="px-2.5 py-1 text-sm font-bold rounded bg-amber-700 text-white">
                          {match.myDeck.sub}
                        </span>
                      )}
                    </div>
                  </td>
                  {/* 先後攻 */}
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      match.playOrder === '先攻'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {match.playOrder}
                    </span>
                  </td>
                  {/* 結果 */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      match.result === 'W'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}>
                      {match.result}
                    </span>
                  </td>
                  {/* 對手牌組 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-sm font-bold rounded bg-blue-700 text-white">
                        {match.oppDeck.main}
                      </span>
                      {match.oppDeck.sub && match.oppDeck.sub !== '無' && (
                        <span className="px-2.5 py-1 text-sm font-bold rounded bg-amber-700 text-white">
                          {match.oppDeck.sub}
                        </span>
                      )}
                    </div>
                  </td>
                  {/* 備註 */}
                  <td className="px-4 py-3">
                    <span className={`text-sm max-w-[150px] truncate block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {match.note || '-'}
                    </span>
                  </td>
                  {/* 操作 - hover 時才顯示 */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingMatch(match)}
                        className={`p-1.5 rounded transition-colors ${
                          isDark 
                            ? 'text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                            : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(match.id)}
                        className={`p-1.5 rounded transition-colors ${
                          isDark
                            ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
