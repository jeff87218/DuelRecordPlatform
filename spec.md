# DuelLog Platform — spec.md (SPA + Go + Postgres, Monorepo)

## 0. 專案目標與定位

### 核心目標（MVP）
做一個比 Excel/Sheet 更快的對局紀錄網站，支援：
- 對局紀錄（Matches）：輸入快速、介面乾淨好看
- 統計儀表板（Dashboard）：KPI + 每日統計 + 對手牌組分布（圓餅圖 + 清單），且圖表有動畫
- 以 Master Duel 為第一個遊戲，但資料模型設計成可擴充多卡牌遊戲（PTCG、UA、航海王…），並支援未來多人使用

### 非目標（MVP 不做）
- 多人協作 workspace / 付費訂閱
- AI 分析實作（只預留介面與資料表/路由插槽）
- 高度複雜的 deck taxonomy 管理後台（先用字典資料即可）

---

## 1. 技術選型

### 前端（SPA）
- React + Vite（SPA 模式）
- Tailwind CSS + shadcn/ui（質感 UI，開發快）
- TanStack Table（Matches 表格的排序/篩選/分頁）
- ECharts（Dashboard 圖表，動畫與客製能力強）
- Framer Motion（卡片/區塊進場與切換動畫）
- （可選）React Hook Form + Zod（表單與驗證）

### 後端
- Go + Fiber（或 Gin 也可，MVP 推 Fiber）
- REST API（MVP 最直覺）
- OpenAPI/Swagger（建議產出 API 文件）

### DB
- PostgreSQL
- Migration：Goose / Atlas / Flyway 任選其一（建議 Goose）
- Query layer（擇一）：
  - sqlc（推薦：能練功，型別安全，SQL 技術會長很快）
  - Ent（推薦：更快上手）

### 部署（先本機、後雲端）
- 本機：Docker Compose 跑 Postgres
- 雲端 DB（推薦）：Neon / Supabase Postgres
- 前端：Cloudflare Pages / Vercel / Netlify（擇一）
- 後端：Fly.io / Render / Railway（擇一）

---

## 2. Postgres 資料放哪裡？

### 本機（地端）Postgres
- 優點：完全免費、離線可用、學習 Docker/DB 很扎實
- 缺點：換電腦/上線要搬資料；想手機記錄時就需要部署到雲端

### 雲端 Postgres（推薦你 MVP 後就切）
- Neon/Supabase：免費 tier 通常夠個人用
- 優點：你任何地方都能記錄（手機/外出）；以後做多人也順
- 缺點：需要設定連線字串與基本安全

**建議策略**：
- Phase 0–3：本機 Postgres（最快啟動）
- Phase 4 之後：可選擇把 DB 轉到 Neon/Supabase（更像正式產品）

---

## 3. Monorepo 結構

repo-root/
apps/
web/ # React + Vite SPA
api/ # Go API server
packages/
shared/ # 共用 types / constants / deck dictionary schema（可先空）
infra/
docker/ # docker-compose 等
docs/
spec.md # 本文件


---

## 4. 需求清單

### 4.1 Matches（對局紀錄，對齊圖一）
每筆對局要記錄：
1) 我方牌組（大軸 / 小軸）
2) 先攻 / 後攻
3) 對手牌組（大軸 / 小軸）
4) 比賽日期
5) 備註（自由文字）
6) 階級 Rank
7) 賽季 Season（S48…）
8) 勝負結果（W/L）

UI 需求（MVP）：
- 表格列表：可排序（日期、勝負）、可篩選（Season、我方大軸、日期區間、勝負、先後攻）
- 新增：右側 Drawer / Modal 皆可（推薦 Drawer：速度感好）
- 編輯/刪除：支援行內操作（刪除需確認）

### 4.2 快速記錄（解決 Excel 複製地獄，MVP 必做）
必做四招：
1) Smart Defaults：預設帶入「最近一次」的 season / rank / 我方 deck
2) Clone Last：一鍵複製上一場，直接開新表單（只改必要欄位）
3) Keyboard Shortcuts：
   - W/L：勝負
   - F/G：先攻/後攻
   - Enter：送出並開下一筆
4) Recent Picks：deck 下拉以最近使用排序，支援搜尋

驗收標準：
- 使用者能在 1 分鐘內新增 5 場，且平均每場比 Excel 更少操作步數

### 4.3 Dashboard 統計（對齊圖二）
統計內容：
- KPI：總場數、先攻率、勝率、先攻勝率、後攻勝率
- Daily table：每天場數、先攻率、勝率、先後攻勝率
- 對手牌組分布：
  - 圓餅圖（動畫）
  - 條列清單（deck 名稱、場數、占比）

篩選器（MVP）：
- Season（必）
- 我方大軸（必）
- 日期範圍（選）
（小軸可先不做篩選，保留欄位）

動畫與美觀：
- 圖表：ECharts（圓餅圖/折線圖動畫）
- UI 進場/切換：Framer Motion（淡入/上滑、切換時柔順）

---

## 5. 資料模型（DB Schema）

### 5.1 可擴充到多遊戲的核心模型
- users（MVP 可先單一 user 或假 user）
- games（Master Duel/PTCG/…）
- seasons（隸屬 games）
- decks（隸屬 games；有 main/sub 屬性或用 tags 表示）
- matches（對局）

### 5.2 Tables（MVP 最小版）

#### users
- id (uuid, pk)
- email (text, unique)
- password_hash (text)  # MVP 可先不做完整 auth，或先做單人模式
- created_at, updated_at

#### games
- id (uuid, pk)
- key (text, unique)  # e.g. "master_duel"
- name (text)         # e.g. "Yu-Gi-Oh! Master Duel"

#### seasons
- id (uuid, pk)
- game_id (uuid, fk games.id)
- code (text)         # e.g. "S48"
- start_date (date, nullable)
- end_date (date, nullable)

#### decks
- id (uuid, pk)
- game_id (uuid, fk games.id)
- main (text)         # 大軸
- sub (text)          # 小軸（可用 "無"）
- unique(game_id, main, sub)

#### matches
- id (uuid, pk)
- user_id (uuid, fk users.id)
- game_id (uuid, fk games.id)
- season_id (uuid, fk seasons.id)
- date (date)                       # 比賽日期
- rank (text)                       # 階級
- my_deck_id (uuid, fk decks.id)
- opp_deck_id (uuid, fk decks.id)
- play_order (text)                 # "先攻" | "後攻"
- result (text)                     # "W" | "L"
- note (text, nullable)
- created_at, updated_at

> 註：opp_deck 也走 decks 表，方便統計；Unknown 可用 decks 內的 (main="Unknown", sub="無")

### 5.3 統計口徑（固定不可漂移）
對於篩選後的 matches 集合 N：
- total = N
- first_rate = count(play_order="先攻") / N
- win_rate = count(result="W") / N
- first_win_rate = count(W & 先攻) / count(先攻)
- second_win_rate = count(W & 後攻) / count(後攻)

Daily stats：按 date group-by 後套用同一套公式

Opponent distribution：預設以「對手大軸」統計
- opp_dist[deck_main] = count(opp_deck.main=deck_main) / N

---

## 6. API 設計（REST）

### 6.1 Health
- GET /health
  - 200 { "ok": true }

### 6.2 Matches CRUD
- GET /matches
  - query:
    - gameKey (default "master_duel")
    - seasonCode (optional)
    - myDeckMain (optional)
    - dateFrom/dateTo (optional)
    - result (optional W/L)
    - playOrder (optional)
  - response: list of matches (joined display fields)

- POST /matches
  - body:
    - gameKey, seasonCode
    - date, rank
    - myDeck: { main, sub }
    - oppDeck: { main, sub }
    - playOrder, result, note
  - behavior:
    - decks/seasons 不存在時可選擇自動建立（MVP 建議：season 不自動，deck 可自動）

- PATCH /matches/:id
- DELETE /matches/:id

### 6.3 Stats
- GET /stats/summary
  - query: gameKey, seasonCode, myDeckMain, dateFrom/dateTo
  - response: { total, firstRate, winRate, firstWinRate, secondWinRate }

- GET /stats/daily
  - response: [{ date, total, firstRate, winRate, firstWinRate, secondWinRate }]

- GET /stats/opponents
  - response: [{ deckMain, count, pct }]

### 6.4 AI 插槽（MVP 不實作分析，只先 stub）
- GET /ai/insights
  - query: gameKey, seasonCode, myDeckMain
  - response: { insights: [ ... ] }  # MVP 可回固定文案
- table: insights（MVP 可先不建，或先建但不寫入）

---

## 7. 前端頁面與元件

### Routes（SPA）
- /matches
- /dashboard
- /settings（可選，MVP 可先不做）

### /matches
- MatchesTable（TanStack Table）
- QuickAddDrawer（新增/編輯表單）
- FiltersBar（season / my deck / date range / result / order）
- Actions：Edit / Delete / Clone Last

### /dashboard
- FiltersBar（season / my deck / date range）
- KPI Cards（Framer Motion 進場 + 數字 count-up）
- DailyTable
- OpponentPieChart（ECharts）
- OpponentList（清單）

---

## 8. Phase 分段開發（Cursor 逐關推進）

### Phase 0：Monorepo 骨架 + 全部跑起來
Deliverables：
- web/api/postgres 一鍵啟動
- GET /health OK
DoD：
- 前端頁面顯示 API ok

### Phase 1：DB Schema + Migration + API CRUD
Deliverables：
- matches CRUD 全通
DoD：
- 可用 curl/Postman 新增、查詢、更新、刪除

### Phase 2：Matches UI（圖一 MVP）
Deliverables：
- /matches 表格 + 新增/編輯/刪除
DoD：
- 1 分鐘能新增 5 場（先不含快捷鍵）

### Phase 3：快速記錄四招（擊敗 Excel）
Deliverables：
- Smart defaults + Clone last + shortcuts + recent picks
DoD：
- 記錄速度顯著提升，複製貼上需求接近 0

### Phase 4：Stats API（先讓數字正確）
Deliverables：
- /stats/summary /daily /opponents 完成，且口徑固定
DoD：
- 抽樣比對結果合理

### Phase 5：Dashboard UI（圖二 + 動畫）
Deliverables：
- KPI + daily table + pie+list（動畫）
DoD：
- 篩選切換時圖表 smooth transition，不閃爍、不卡

### Phase 6：多遊戲骨架（未來擴充）
Deliverables：
- game 切換（至少 Master Duel + 另一個遊戲示例）
DoD：
- decks/ranks 依 game 隔離

### Phase 7：Auth（多人使用前置）
Deliverables：
- login/register（或 OAuth）
DoD：
- 資料隔離正確

### Phase 8：AI Insights（MVP 後）
Deliverables：
- Insights 區塊可顯示（先 stub）
DoD：
- 之後可接 worker/queue

---

## 9. 非功能需求
- 資料一致性：統計口徑統一由後端提供
- 可維護性：shared package 放 types/constants
- 安全：環境變數不可進 repo；prod 必須啟用 CORS 限制與 token

---

## 10. 開工前置步驟（Checklist）

### 10.1 建 GitHub Repo（Monorepo）
1) GitHub 建立新 repo：`duellog`（public/private 都可）
2) Clone 到本機
3) 建立上述 monorepo 資料夾結構
4) 設定 .gitignore（node/go/env）
5) 第一次 commit：`chore: bootstrap monorepo`

### 10.2 DB 選擇：本機 or 雲端
#### 方案 A：本機（MVP 建議）
- 用 docker compose 起 postgres
- 優先讓你快看到成果

#### 方案 B：Neon / Supabase（推薦上線）
- Neon：建立 project 後會給你 `DATABASE_URL`
- Supabase：建立 project 後在 settings/database 拿連線字串

> MVP 先本機，後續改用雲端時，只要換 DATABASE_URL 與跑 migration。

### 10.3 環境變數（兩端）
- apps/api/.env
  - DATABASE_URL=postgres://...
  - PORT=8080
- apps/web/.env
  - VITE_API_BASE_URL=http://localhost:8080

### 10.4 Seed 初始資料
- games: master_duel
- seasons: S48
- decks: (Unknown/無) 至少要有

---

## 11. 驗收（Definition of Done）
- Matches：新增/編輯/刪除可用且快速
- 快速記錄：四招完成，明顯比 Excel 快
- Dashboard：KPI + daily + opponent pie+list（動畫）一致且好看
- 多遊戲骨架：資料模型不綁死 Master Duel
- 可部署：至少能在雲端 DB + 雲端 API + 靜態前端跑起來

---
