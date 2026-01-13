import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../contexts/ThemeContext'
import { decksService, THEME_COLORS, THEME_OPTIONS, type DeckTheme, type DeckTemplate } from '../services/decksService'

export default function DecksPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const queryClient = useQueryClient()
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckTheme, setNewDeckTheme] = useState<DeckTheme>('連結')
  const [editingDeck, setEditingDeck] = useState<DeckTemplate | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // 取得牌組資料
  const { data, isLoading } = useQuery({
    queryKey: ['deck-templates'],
    queryFn: () => decksService.getTemplates(),
  })

  // 新增 mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; theme: string; deckType: 'main' | 'sub' }) => 
      decksService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck-templates'] })
      setNewDeckName('')
      setNewDeckTheme('連結')
      setShowAddForm(false)
    },
  })

  // 更新 mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; theme?: string } }) => 
      decksService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck-templates'] })
      setEditingDeck(null)
      setNewDeckName('')
      setNewDeckTheme('連結')
    },
  })

  // 刪除 mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => decksService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck-templates'] })
    },
  })

  const containerClass = `rounded-2xl p-6 ${
    isDark
      ? 'bg-[#16161c] border border-[#2a2a35]'
      : 'bg-white border border-gray-200 shadow-sm'
  }`

  const handleAdd = () => {
    if (!newDeckName.trim()) return
    createMutation.mutate({
      name: newDeckName.trim(),
      theme: newDeckTheme,
      deckType: 'main', // 統一用 main
    })
  }

  const handleUpdate = () => {
    if (!editingDeck || !newDeckName.trim()) return
    updateMutation.mutate({
      id: editingDeck.id,
      data: {
        name: newDeckName.trim(),
        theme: newDeckTheme,
      },
    })
  }

  const startEdit = (deck: DeckTemplate) => {
    setEditingDeck(deck)
    setNewDeckName(deck.name)
    setNewDeckTheme(deck.theme as DeckTheme)
  }

  // 當表單顯示時，自動滾動到表單位置
  useEffect(() => {
    if ((showAddForm || editingDeck) && formRef.current) {
      // 使用 setTimeout 確保 DOM 已更新
      setTimeout(() => {
        formRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      }, 100)
    }
  }, [showAddForm, editingDeck])

  const cancelEdit = () => {
    setEditingDeck(null)
    setNewDeckName('')
    setNewDeckTheme('連結')
    setShowAddForm(false)
  }

  // 所有牌組（不分主副軸）
  const allDecks = data?.templates || []

  return (
    <div>
      {/* 頂部工具列 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">牌組管理</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          + 新增牌組
        </button>
      </div>

      <div className={containerClass}>
        {/* 說明文字 */}
        <p className={`mb-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          在這裡管理所有可選的牌組，設定的主題類型會影響對局記錄中顯示的顏色。
        </p>

        {/* 新增/編輯表單 */}
        {(showAddForm || editingDeck) && (
          <div 
            ref={formRef}
            className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50 border border-gray-200'}`}
          >
            <h3 className="text-lg font-bold mb-4">
              {editingDeck ? '編輯牌組' : '新增牌組'}
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  牌組名稱
                </label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="例如：星辰"
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    isDark 
                      ? 'bg-[#16161c] border-white/10 text-white focus:border-indigo-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
                  } focus:outline-none`}
                />
              </div>
            </div>
            {/* 主題類型選擇 - 按鈕式 */}
            <div className="mb-4">
              <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                主題類型
              </label>
              <div className="flex flex-wrap gap-2">
                {THEME_OPTIONS.map((t) => {
                  const isSelected = newDeckTheme === t
                  const colors = THEME_COLORS[t]
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewDeckTheme(t)}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                        isSelected
                          ? `${colors.bg} ${colors.text} ring-2 ring-offset-2 ${isDark ? 'ring-offset-[#1e1e26]' : 'ring-offset-gray-50'} ring-indigo-500`
                          : `${colors.bg} ${colors.text} opacity-50 hover:opacity-80`
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
            {/* 顏色預覽 */}
            <div className="mb-4">
              <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                預覽
              </label>
              <span className={`inline-block px-3 py-1.5 rounded font-bold ${THEME_COLORS[newDeckTheme].bg} ${THEME_COLORS[newDeckTheme].text}`}>
                {newDeckName || '牌組名稱'}
              </span>
            </div>
            {/* 錯誤訊息 */}
            {(createMutation.isError || updateMutation.isError) && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                操作失敗，請稍後再試
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={cancelEdit}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                取消
              </button>
              <button
                onClick={editingDeck ? handleUpdate : handleAdd}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? '處理中...' : (editingDeck ? '更新' : '新增')}
              </button>
            </div>
          </div>
        )}

        {/* 顏色圖例 */}
        <div className="mb-6">
          <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>主題顏色</h4>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map((t) => (
              <span
                key={t}
                className={`px-2 py-1 text-xs font-medium rounded ${THEME_COLORS[t].bg} ${THEME_COLORS[t].text}`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 牌組列表 */}
        {!isLoading && allDecks.length > 0 && (
          <div className="grid grid-cols-5 gap-3">
            {allDecks.map((deck) => {
              const colors = THEME_COLORS[deck.theme as DeckTheme] || THEME_COLORS['無']
              return (
                <div
                  key={deck.id}
                  className={`group relative p-3 rounded-xl transition-colors ${
                    isDark ? 'bg-[#1e1e26] hover:bg-[#252530]' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-sm font-bold rounded ${colors.bg} ${colors.text}`}>
                      {deck.name}
                    </span>
                  </div>
                  {/* 操作按鈕 */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(deck)}
                      className={`p-1 rounded transition-colors ${
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
                      onClick={() => deleteMutation.mutate(deck.id)}
                      disabled={deleteMutation.isPending}
                      className={`p-1 rounded transition-colors ${
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
                </div>
              )
            })}
          </div>
        )}

        {/* 空狀態 */}
        {!isLoading && allDecks.length === 0 && (
          <div className={`rounded-xl p-12 text-center ${isDark ? 'bg-[#1e1e26]' : 'bg-gray-50'}`}>
            <div className="text-4xl mb-4">🃏</div>
            <p className="text-gray-500 mb-4">尚無牌組</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              新增第一個牌組
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
