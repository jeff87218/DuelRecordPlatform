import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export default function AppShell() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const navItems = [
    { 
      path: '/season', 
      label: '當季記錄',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      path: '/history', 
      label: '歷史總記錄',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    { 
      path: '/decks', 
      label: '牌組管理',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
  ]

  return (
    <div className={`min-h-screen flex ${
      theme === 'dark' 
        ? 'bg-[#0a0a0f] text-white' 
        : 'bg-gray-100 text-gray-900'
    }`}>
      {/* ===== 左側 Sidebar ===== */}
      <aside className={`w-[72px] flex flex-col items-center py-5 fixed h-screen ${
        theme === 'dark'
          ? 'bg-[#111118] border-r border-white/10'
          : 'bg-white border-r border-gray-200'
      }`}>
        {/* Logo */}
        <img
          src="https://shared.fastly.steamstatic.com/community_assets/images/apps/1449850/406324fa371f190a0392f5e4e76d595e7ae962f5.jpg"
          alt="Yu-Gi-Oh! Master Duel"
          className="w-10 h-10 rounded-xl mb-8 object-cover"
          loading="lazy"
        />

        {/* Nav Icons */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={item.label}
              >
                {item.icon}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* ===== 主內容區 ===== */}
      <div className="flex-1 ml-[72px] flex flex-col">
        {/* ===== 頂部 Header Bar ===== */}
        <header className={`h-14 flex items-center justify-between px-6 sticky top-0 z-40 ${
          theme === 'dark'
            ? 'bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-white/5'
            : 'bg-gray-100/80 backdrop-blur-sm border-b border-gray-200'
        }`}>
          <div className="text-lg font-semibold">DuelLog</div>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-white/10'
                : 'hover:bg-gray-200'
            }`}
            aria-label="切換主題"
          >
            {theme === 'dark' ? (
              // 太陽 icon (切換到淺色)
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              // 月亮 icon (切換到深色)
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </header>

        {/* ===== 主內容區 ===== */}
        <main className="flex-1 p-6 max-w-[1800px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
