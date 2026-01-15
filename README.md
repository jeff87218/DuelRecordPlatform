# DuelRecordPlatform（DuelLog）

Master Duel 對局記錄平台：用更快的方式記錄、回顧與統計你的對局。

## 功能簡介

- 記錄對局：先手/後手、勝敗、對手牌組、我方牌組等
- 賽季與歷史頁面統計（/season、/history）
- 活動標籤：`Ranked / Rating / DC`

## 環境需求

以下為本專案目前使用的版本：

- Go：1.25.5 以上（`go version`）[Golang官方下載](https://go.dev/dl/go1.25.5.windows-amd64.msi)
- Node.js：22.2.0 以上（`node -v`）[Node.js官方下載](https://nodejs.org/dist/v22.2.0/node-v22.2.0-x64.msi)

- 腳本或是指令在執行（`go run .`）」時，需要安裝 C 編譯器（GCC）。
  - 我目前使用過的安裝檔是：`tdm64-gcc-10.3.0-2.exe` 如果你電腦沒有gcc可安裝此 [tdm64-gcc](https://github.com/jmeubank/tdm-gcc/releases/download/v10.3.0-tdm64-2/tdm64-gcc-10.3.0-2.exe)。

## 快速開始（一般使用者：推薦）

如果你不熟程式，建議直接下載 zip 或用 GitHub Desktop / git clone 拿到檔案後，直接執行我準備好的腳本 `start-duellog.bat`。

<img width="1193" height="649" alt="image" src="https://github.com/user-attachments/assets/0a05d4a4-49b9-4701-97a2-cf1aa912a3b0" />

### 1) 下載並解壓縮或是從github上clone

- 下載 Release 壓縮檔後解壓縮
- 也可使用 `git clone https://github.com/Welly0902/DuelRecordPlatform.git` 獲得檔案
- 進到解壓縮後的資料夾（專案根目錄會看到 `start-duellog.bat`）

### 2) 一鍵啟動（推薦）

在專案根目錄「雙擊」執行：`start-duellog.bat`

它會自動：

- 啟動後端（Go API）
- 啟動前端（Web）
- 第一次啟動若前端尚未安裝依賴，會先自動執行 `npm install`
- 自動開啟瀏覽器到 `/history`

### 3) 打開網頁開始使用

- `http://localhost:5173/history`

補充：

- 後端會在 `apps/api` 建立本機資料庫檔案：`duellog.db`
- 若你想重置資料，可關掉程式後刪除 `duellog.db` 再重新啟動

## 快速開始（開發者：從原始碼）

以下假設你下載解壓後的資料夾名稱是 `DuelRecordPlatform-main`。

### 1) 啟動後端（Go API）

```powershell/cmd
cd DuelRecordPlatform-main\apps\api
go run .
```

預設後端會跑在：`http://localhost:8080`

你也可以用健康檢查確認：

- `http://localhost:8080/health`

### 2) 啟動前端（Web）

```powershell/cmd
cd DuelRecordPlatform-main\apps\web
npm install
npm run dev
```

預設前端會跑在：`http://localhost:5173`

### 3) 開始使用

打開以下網址就能開始：

- `http://localhost:5173/history`

## 第一次啟動會自動做什麼

- 若資料庫尚未建立，後端會自動套用 migrations 建表。
- 預設會自動套用 `apps/api/seed.sql`（可共享的 `deck_templates` + 最小必要資料）。
  - 如果你不想自動 seed，可在啟動前設定環境變數：`AUTO_SEED=false`

## 常見問題

### Windows：go-sqlite3 編譯失敗

如果在執行 `go run .` 時看到 `gcc: command not found`、`cgo` 相關錯誤，通常是因為沒有安裝 GCC（或沒有加入 PATH）。

- 請先安裝 MinGW 或 TDM-GCC，並重新開一個終端機後確認：`gcc --version`
- 然後再重新執行：`go run .`

### 前端無法連接後端

- 確認後端正在跑：`http://localhost:8080/health`
- 確認前端 API 設定（例如 `VITE_API_BASE_URL`）
