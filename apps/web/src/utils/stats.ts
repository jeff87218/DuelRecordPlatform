import type { Match } from '../types/match'

export interface DeckStatRow {
  name: string
  games: number
  wins: number
  losses: number
  winRate: number // 0-100
}

export interface DailyStatRow {
  date: string // YYYY-MM-DD
  games: number
  wins: number
  losses: number
  first: number
  second: number
  firstWins: number
  firstLosses: number
  secondWins: number
  secondLosses: number
  firstRate: number | null // 0-100
  winRate: number | null // null when games == 0
  firstWinRate: number | null
  secondWinRate: number | null
}

export interface SeasonStats {
  total: number
  wins: number
  losses: number
  winRate: number
  firstCount: number
  secondCount: number
  firstWins: number
  secondWins: number
  firstRate: number
  firstWinRate: number
  secondWinRate: number
  oppDecks: DeckStatRow[]
  myDecks: DeckStatRow[]
  daily: DailyStatRow[]
}

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYMD(s: string): Date {
  // Treat as local date (no timezone shift)
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function dateKeyFromMatch(match: Match): string {
  // API date may be YYYY-MM-DD or ISO; normalize to YYYY-MM-DD.
  return match.date.includes('T') ? match.date.split('T')[0] : match.date
}

function toDeckStats(rows: Array<{ name: string; wins: number; losses: number }>): DeckStatRow[] {
  return rows
    .map(r => {
      const games = r.wins + r.losses
      const winRate = games > 0 ? clamp01(r.wins / games) * 100 : 0
      return {
        name: r.name,
        games,
        wins: r.wins,
        losses: r.losses,
        winRate,
      }
    })
    .sort((a, b) => b.games - a.games)
}

export function buildSeasonStats(matches: Match[], range?: { start: string; end: string }): SeasonStats {
  const total = matches.length
  const wins = matches.filter(m => m.result === 'W').length
  const losses = matches.filter(m => m.result === 'L').length
  const winRate = total > 0 ? (wins / total) * 100 : 0

  const firstMatches = matches.filter(m => m.playOrder === '先攻')
  const secondMatches = matches.filter(m => m.playOrder === '後攻')
  const firstCount = firstMatches.length
  const secondCount = secondMatches.length
  const firstWins = firstMatches.filter(m => m.result === 'W').length
  const secondWins = secondMatches.filter(m => m.result === 'W').length
  const firstRate = total > 0 ? (firstCount / total) * 100 : 0
  const firstWinRate = firstCount > 0 ? (firstWins / firstCount) * 100 : 0
  const secondWinRate = secondCount > 0 ? (secondWins / secondCount) * 100 : 0

  const oppMap = new Map<string, { wins: number; losses: number }>()
  const myMap = new Map<string, { wins: number; losses: number }>()

  for (const m of matches) {
    const opp = m.oppDeck?.main || '未知'
    const mine = m.myDeck?.main || '未知'

    const isWin = m.result === 'W'

    const oppEntry = oppMap.get(opp) ?? { wins: 0, losses: 0 }
    if (isWin) oppEntry.wins += 1
    else oppEntry.losses += 1
    oppMap.set(opp, oppEntry)

    const myEntry = myMap.get(mine) ?? { wins: 0, losses: 0 }
    if (isWin) myEntry.wins += 1
    else myEntry.losses += 1
    myMap.set(mine, myEntry)
  }

  const oppDecks = toDeckStats(
    Array.from(oppMap.entries()).map(([name, v]) => ({ name, wins: v.wins, losses: v.losses })),
  )

  const myDecks = toDeckStats(
    Array.from(myMap.entries()).map(([name, v]) => ({ name, wins: v.wins, losses: v.losses })),
  )

  const dailyMap = new Map<
    string,
    {
      wins: number
      losses: number
      first: number
      second: number
      firstWins: number
      firstLosses: number
      secondWins: number
      secondLosses: number
    }
  >()
  for (const m of matches) {
    const key = dateKeyFromMatch(m)
    const entry = dailyMap.get(key) ?? {
      wins: 0,
      losses: 0,
      first: 0,
      second: 0,
      firstWins: 0,
      firstLosses: 0,
      secondWins: 0,
      secondLosses: 0,
    }

    const isWin = m.result === 'W'
    if (isWin) entry.wins += 1
    else entry.losses += 1

    if (m.playOrder === '先攻') {
      entry.first += 1
      if (isWin) entry.firstWins += 1
      else entry.firstLosses += 1
    } else {
      entry.second += 1
      if (isWin) entry.secondWins += 1
      else entry.secondLosses += 1
    }

    dailyMap.set(key, entry)
  }

  let daily: DailyStatRow[] = []
  if (range?.start && range?.end) {
    const start = parseYMD(range.start)
    const end = parseYMD(range.end)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = formatDateYMD(d)
      const entry = dailyMap.get(key)
      const games = entry ? entry.wins + entry.losses : 0
      const win = entry ? entry.wins : 0
      const loss = entry ? entry.losses : 0
      const first = entry ? entry.first : 0
      const second = entry ? entry.second : 0
      const firstWinsDay = entry ? entry.firstWins : 0
      const secondWinsDay = entry ? entry.secondWins : 0
      const firstLossesDay = entry ? entry.firstLosses : 0
      const secondLossesDay = entry ? entry.secondLosses : 0
      daily.push({
        date: key,
        games,
        wins: win,
        losses: loss,
        first,
        second,
        firstWins: firstWinsDay,
        firstLosses: firstLossesDay,
        secondWins: secondWinsDay,
        secondLosses: secondLossesDay,
        firstRate: games > 0 ? (first / games) * 100 : null,
        winRate: games > 0 ? (win / games) * 100 : null,
        firstWinRate: first > 0 ? (firstWinsDay / first) * 100 : null,
        secondWinRate: second > 0 ? (secondWinsDay / second) * 100 : null,
      })
    }
  } else {
    daily = Array.from(dailyMap.entries())
      .map(([date, v]) => {
        const games = v.wins + v.losses
        return {
          date,
          games,
          wins: v.wins,
          losses: v.losses,
          first: v.first,
          second: v.second,
          firstWins: v.firstWins,
          firstLosses: v.firstLosses,
          secondWins: v.secondWins,
          secondLosses: v.secondLosses,
          firstRate: games > 0 ? (v.first / games) * 100 : null,
          winRate: games > 0 ? (v.wins / games) * 100 : null,
          firstWinRate: v.first > 0 ? (v.firstWins / v.first) * 100 : null,
          secondWinRate: v.second > 0 ? (v.secondWins / v.second) * 100 : null,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  return {
    total,
    wins,
    losses,
    winRate,
    firstCount,
    secondCount,
    firstWins,
    secondWins,
    firstRate,
    firstWinRate,
    secondWinRate,
    oppDecks,
    myDecks,
    daily,
  }
}
