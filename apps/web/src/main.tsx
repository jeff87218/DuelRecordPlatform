import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'
import AppShell from './components/AppShell'
import SeasonMatchesPage from './pages/SeasonMatchesPage'
import HistoryMatchesPage from './pages/HistoryMatchesPage'
import DecksPage from './pages/DecksPage'

// 建立 QueryClient 實例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppShell />}>
              {/* 首頁重新導向到當季記錄 */}
              <Route index element={<Navigate to="/season" replace />} />
              {/* 當季記錄 */}
              <Route path="season" element={<SeasonMatchesPage />} />
              {/* 歷史總記錄 */}
              <Route path="history" element={<HistoryMatchesPage />} />
              {/* 牌組管理頁面 */}
              <Route path="decks" element={<DecksPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
