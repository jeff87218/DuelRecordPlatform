import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { matchesService } from '../services/matchesService'
import { useTheme } from '../contexts/ThemeContext'
import type { Match } from '../types/match'

interface DefaultValues {
  date?: string
  rank?: string
  myDeckMain?: string
  myDeckSub?: string
}

interface MatchFormProps {
  onCancel: () => void
  onSuccess: () => void
  defaultValues?: DefaultValues
  editMatch?: Match  // 如果有值，代表是編輯模式
}

// 階級選項
const RANK_TIERS = ['銅', '銀', '金', '白金', '鑽石', '大師'] as const
const RANK_LEVELS = ['V', 'IV', 'III', 'II', 'I'] as const

// 預設牌組選項（之後可以從 API 取得）
const DEFAULT_DECKS = [
  '雷熱', '閃刀姬', '蛇眼', '粛聲', 'R-ACE', '烙印', '天盃龍', 'YO', 
  '神碑', '幻奏', '龍輝巧', '炎王', '深淵', 'Unknown'
]

const DEFAULT_SUBS = ['無', '弓劍', '原罪', '深淵', '罪寶']

// 從階級字串解析 tier 和 level
function parseRank(rank: string): { tier: string; level: string } {
  for (const tier of RANK_TIERS) {
    if (rank.startsWith(tier)) {
      const level = rank.replace(tier, '')
      if (RANK_LEVELS.includes(level as typeof RANK_LEVELS[number])) {
        return { tier, level }
      }
    }
  }
  return { tier: '金', level: 'V' }
}

export default function MatchForm({ onCancel, onSuccess, defaultValues, editMatch }: MatchFormProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const queryClient = useQueryClient()
  const isEditMode = !!editMatch

  // 決定初始值來源：編輯模式用 editMatch，新增模式用 defaultValues
  const initialData = isEditMode ? {
    date: editMatch.date.split('T')[0],
    rank: editMatch.rank,
    myDeckMain: editMatch.myDeck.main,
    myDeckSub: editMatch.myDeck.sub || '無',
    oppDeckMain: editMatch.oppDeck.main,
    oppDeckSub: editMatch.oppDeck.sub || '無',
    playOrder: editMatch.playOrder,
    result: editMatch.result,
    note: editMatch.note || '',
  } : {
    date: defaultValues?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    rank: defaultValues?.rank || '金V',
    myDeckMain: defaultValues?.myDeckMain || '',
    myDeckSub: defaultValues?.myDeckSub || '無',
    oppDeckMain: '',
    oppDeckSub: '無',
    playOrder: '先攻' as const,
    result: 'W' as const,
    note: '',
  }

  // 解析預設階級
  const defaultRank = parseRank(initialData.rank)

  // 表單狀態
  const [date, setDate] = useState(initialData.date)
  const [rankTier, setRankTier] = useState<string>(defaultRank.tier)
  const [rankLevel, setRankLevel] = useState<string>(defaultRank.level)
  const [myDeckMain, setMyDeckMain] = useState(initialData.myDeckMain)
  const [myDeckSub, setMyDeckSub] = useState(initialData.myDeckSub)
  const [oppDeckMain, setOppDeckMain] = useState(initialData.oppDeckMain)
  const [oppDeckSub, setOppDeckSub] = useState(initialData.oppDeckSub)
  const [playOrder, setPlayOrder] = useState<'先攻' | '後攻'>(initialData.playOrder)
  const [result, setResult] = useState<'W' | 'L'>(initialData.result)
  const [note, setNote] = useState(initialData.note)

  // 搜尋狀態
  const [myDeckSearch, setMyDeckSearch] = useState('')
  const [oppDeckSearch, setOppDeckSearch] = useState('')
  const [showMyDeckDropdown, setShowMyDeckDropdown] = useState(false)
  const [showOppDeckDropdown, setShowOppDeckDropdown] = useState(false)

  // 篩選牌組選項
  const filteredMyDecks = useMemo(() => {
    if (!myDeckSearch) return DEFAULT_DECKS
    return DEFAULT_DECKS.filter(d => d.toLowerCase().includes(myDeckSearch.toLowerCase()))
  }, [myDeckSearch])

  const filteredOppDecks = useMemo(() => {
    if (!oppDeckSearch) return DEFAULT_DECKS
    return DEFAULT_DECKS.filter(d => d.toLowerCase().includes(oppDeckSearch.toLowerCase()))
  }, [oppDeckSearch])

  // 組合階級字串
  const rank = `${rankTier}${rankLevel}`

  // 新增 mutation
  const createMutation = useMutation({
    mutationFn: () => matchesService.createMatch({
      gameKey: 'master_duel',
      seasonCode: 'S48',
      date,
      rank,
      myDeck: { main: myDeckMain || myDeckSearch, sub: myDeckSub === '無' ? null : myDeckSub },
      oppDeck: { main: oppDeckMain || oppDeckSearch, sub: oppDeckSub === '無' ? null : oppDeckSub },
      playOrder,
      result,
      note: note || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      onSuccess()
    },
  })

  // 更新 mutation
  const updateMutation = useMutation({
    mutationFn: () => matchesService.updateMatch(editMatch!.id, {
      date,
      rank,
      myDeck: { main: myDeckMain || myDeckSearch, sub: myDeckSub === '無' ? null : myDeckSub },
      oppDeck: { main: oppDeckMain || oppDeckSearch, sub: oppDeckSub === '無' ? null : oppDeckSub },
      playOrder,
      result,
      note: note || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      onSuccess()
    },
  })

  const mutation = isEditMode ? updateMutation : createMutation

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!myDeckMain && !myDeckSearch) {
      alert('請選擇我方牌組')
      return
    }
    if (!oppDeckMain && !oppDeckSearch) {
      alert('請選擇對手牌組')
      return
    }
    mutation.mutate()
  }

  // 樣式
  const inputClass = `w-full px-3 py-2 rounded-lg border transition-colors ${
    isDark 
      ? 'bg-[#1e1e26] border-white/10 text-white focus:border-indigo-500' 
      : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
  } focus:outline-none`

  const labelClass = `block text-sm font-bold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{isEditMode ? '編輯對局' : '新增對局'}</h2>
        <button
          type="button"
          onClick={onCancel}
          className={`p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-5">
        {/* 日期 */}
        <div>
          <label className={labelClass}>日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* 階級選擇器 */}
        <div>
          <label className={labelClass}>階級</label>
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#1e1e26] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            {/* Level 標題列 */}
            <div className="grid grid-cols-6 gap-1 mb-2">
              <div></div>
              {RANK_LEVELS.map(level => (
                <div key={level} className={`text-center text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {level}
                </div>
              ))}
            </div>
            {/* Tier 行 */}
            {RANK_TIERS.map(tier => (
              <div key={tier} className="grid grid-cols-6 gap-1 mb-1">
                <div className={`text-xs font-medium flex items-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {tier}
                </div>
                {RANK_LEVELS.map(level => {
                  const isSelected = rankTier === tier && rankLevel === level
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => { setRankTier(tier); setRankLevel(level) }}
                      className={`h-8 rounded transition-all text-xs font-medium ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : isDark
                            ? 'bg-white/5 hover:bg-white/10 text-gray-400'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                      }`}
                    >
                      {isSelected && '✓'}
                    </button>
                  )
                })}
              </div>
            ))}
            <div className={`mt-2 text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              已選擇：<span className="font-bold text-indigo-400">{rank}</span>
            </div>
          </div>
        </div>

        {/* 我方牌組 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className={labelClass}>我方牌組 (主軸)</label>
            <input
              type="text"
              value={myDeckMain || myDeckSearch}
              onChange={(e) => {
                setMyDeckSearch(e.target.value)
                setMyDeckMain('')
                setShowMyDeckDropdown(true)
              }}
              onFocus={() => setShowMyDeckDropdown(true)}
              onBlur={() => setTimeout(() => setShowMyDeckDropdown(false), 200)}
              placeholder="搜尋或輸入..."
              className={inputClass}
            />
            {showMyDeckDropdown && filteredMyDecks.length > 0 && (
              <div className={`absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border shadow-lg ${
                isDark ? 'bg-[#1e1e26] border-white/10' : 'bg-white border-gray-200'
              }`}>
                {filteredMyDecks.map(deck => (
                  <button
                    key={deck}
                    type="button"
                    onClick={() => {
                      setMyDeckMain(deck)
                      setMyDeckSearch('')
                      setShowMyDeckDropdown(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                    }`}
                  >
                    {deck}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>副軸</label>
            <select
              value={myDeckSub}
              onChange={(e) => setMyDeckSub(e.target.value)}
              className={inputClass}
            >
              {DEFAULT_SUBS.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 對手牌組 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className={labelClass}>對手牌組 (主軸)</label>
            <input
              type="text"
              value={oppDeckMain || oppDeckSearch}
              onChange={(e) => {
                setOppDeckSearch(e.target.value)
                setOppDeckMain('')
                setShowOppDeckDropdown(true)
              }}
              onFocus={() => setShowOppDeckDropdown(true)}
              onBlur={() => setTimeout(() => setShowOppDeckDropdown(false), 200)}
              placeholder="搜尋或輸入..."
              className={inputClass}
            />
            {showOppDeckDropdown && filteredOppDecks.length > 0 && (
              <div className={`absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border shadow-lg ${
                isDark ? 'bg-[#1e1e26] border-white/10' : 'bg-white border-gray-200'
              }`}>
                {filteredOppDecks.map(deck => (
                  <button
                    key={deck}
                    type="button"
                    onClick={() => {
                      setOppDeckMain(deck)
                      setOppDeckSearch('')
                      setShowOppDeckDropdown(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                    }`}
                  >
                    {deck}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>副軸</label>
            <select
              value={oppDeckSub}
              onChange={(e) => setOppDeckSub(e.target.value)}
              className={inputClass}
            >
              {DEFAULT_SUBS.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 先後攻 & 結果 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>先後攻</label>
            <select
              value={playOrder}
              onChange={(e) => setPlayOrder(e.target.value as '先攻' | '後攻')}
              className={inputClass}
            >
              <option value="先攻">先攻</option>
              <option value="後攻">後攻</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>結果</label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as 'W' | 'L')}
              className={inputClass}
            >
              <option value="W">勝 (W)</option>
              <option value="L">敗 (L)</option>
            </select>
          </div>
        </div>

        {/* 備註 */}
        <div>
          <label className={labelClass}>備註</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="輸入備註..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* 錯誤訊息 */}
        {mutation.isError && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {isEditMode ? '更新失敗，請稍後再試' : '新增失敗，請稍後再試'}
          </div>
        )}

        {/* 按鈕 */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
              isDark 
                ? 'bg-white/10 hover:bg-white/20' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {mutation.isPending 
              ? (isEditMode ? '更新中...' : '新增中...') 
              : (isEditMode ? '確認更新' : '確認新增')
            }
          </button>
        </div>
      </div>
    </form>
  )
}
