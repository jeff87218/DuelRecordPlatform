# DuelRecordPlatform（DuelLog）

Master Duel 對局記錄平台：用更快的方式記錄、回顧與統計你的對局。

## - 功能簡介

- 記錄對局：先手/後手、勝敗、對手牌組、我方牌組等
- 賽季與歷史頁面統計（/season、/history）
- 活動標籤：`Ranked / Rating / DC`
<img width="3808" height="1835" alt="image" src="https://github.com/user-attachments/assets/cb3fdf99-be45-4450-9839-2f3908c5f4a9" />



## - 環境需求

以下為本專案目前使用的版本：

- Go：1.25.5 以上（`go version`）[Golang官方下載](https://go.dev/dl/go1.25.5.windows-amd64.msi)
- Node.js：22.2.0 以上（`node -v`）[Node.js官方下載](https://nodejs.org/dist/v22.2.0/node-v22.2.0-x64.msi)

- 腳本或是指令在執行（`go run .`）」時，需要安裝 C 編譯器（GCC）。
  - 我目前使用過的安裝檔是：`tdm64-gcc-10.3.0-2.exe` 如果你電腦沒有gcc可安裝此 [tdm64-gcc](https://github.com/jmeubank/tdm-gcc/releases/download/v10.3.0-tdm64-2/tdm64-gcc-10.3.0-2.exe)。

上述三者缺一都會造成執行錯誤，請確認安裝完成
## - 快速開始（一般使用者：推薦）

一般使用者建議直接下載 zip 或用 GitHub Desktop / git clone 拿到檔案後，直接執行腳本 `start-duellog.bat` 來啟動網站。

<img width="715" height="659" alt="image" src="https://github.com/user-attachments/assets/dc6427c3-efa4-49a9-b388-8b1d9c8c3c8a" />

<img width="1193" height="649" alt="image" src="https://github.com/user-attachments/assets/0a05d4a4-49b9-4701-97a2-cf1aa912a3b0" />

### 1) 下載並解壓縮或是從 github 上 clone

- 下載 Release 壓縮檔後解壓縮
- 也可使用 `git clone https://github.com/Welly0902/DuelRecordPlatform.git` 獲得檔案
- 進到解壓縮後的資料夾（專案根目錄會看到 `start-duellog.bat`）

### 2) 一鍵啟動（推薦）

在專案根目錄「雙擊」執行：`start-duellog.bat`

它會自動：

- 啟動後端（Go API）
- 啟動前端（Web）
- 第一次啟動若前端尚未安裝依賴，會先自動執行 `npm install` 安裝相關的套件
- 自動開啟瀏覽器到 `/history`

### 3) 打開網頁開始使用

- `http://localhost:5173/history`

補充：

- 後端會在 `apps/api` 建立本機資料庫檔案：`duellog.db`
- 若你想重置資料，可關掉程式後刪除 `duellog.db` 再重新啟動

## - 快速開始（開發者：從原始碼）

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

## - 第一次啟動會自動做什麼

- 若資料庫尚未建立，後端會自動套用 migrations 建表。
- 預設會自動套用 `apps/api/seed.sql`（可共享的 `deck_templates` + 最小必要資料）。
  - 如果你不想自動 seed，可在啟動前設定環境變數：`AUTO_SEED=false`

## - 常見問題

### Windows：go-sqlite3 編譯失敗

如果在執行 `go run .` 時看到 `gcc: command not found`、`cgo` 相關錯誤，通常是因為沒有安裝 GCC（或沒有加入 PATH）。

- 請先安裝 MinGW 或 TDM-GCC，並重新開一個終端機後確認：`gcc --version`
- 然後再重新執行：`go run .`

### 前端無法連接後端

- 確認後端正在跑：`http://localhost:8080/health`
- 確認前端 API 設定（例如 `VITE_API_BASE_URL`）

## - 網頁使用方式:
左方 sidebar 分成三個功能:
1. 當季對局紀錄
2. 歷史對局紀錄
3. 可選擇的牌組管理(比如之後出K9, 可以在手動新增並選擇牌組類別來決定顏色，這樣就可以在對局紀錄加入K9的牌組對局紀錄)

---

### 新增對局紀錄
*新增紀錄*
<img width="1249" height="635" alt="image" src="https://github.com/user-attachments/assets/dc86eb1f-3b40-4c06-b6b2-e7401fbd974b" />
*並填妥對局資訊*
<img width="2506" height="1545" alt="image" src="https://github.com/user-attachments/assets/6bf09dbc-0387-405a-bd3f-1858f72b47b4" />

### 使用情境
*查看自己牌組本季遇上某一套牌的統計數據*
<img width="1197" height="1498" alt="image" src="https://github.com/user-attachments/assets/4aa5cfcd-c58f-4c95-a251-1d4335661603" />

*查看自己某一套牌本季遇到的牌組對局統計數據*
<img width="1200" height="1391" alt="image" src="https://github.com/user-attachments/assets/36409dff-74b4-4121-92d3-4496891f62b6" />

*查看自己某一套牌歷史遇到牌組隊局統計數據*
<img width="1223" height="1195" alt="image" src="https://github.com/user-attachments/assets/6ef52d33-e5c7-4753-9d41-ca4abca9a821" />

*該季每日數據*
<img width="1158" height="652" alt="image" src="https://github.com/user-attachments/assets/48a434ad-3963-478c-bb23-b48e46dca42e" />

有什麼建議在歡迎提出，感謝!

