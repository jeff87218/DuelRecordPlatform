@echo off
setlocal

REM Use UTF-8 output (messages may still depend on console font)
chcp 65001 >nul

pushd "%~dp0"
echo === DuelLog Launcher ===
echo Repo root: %CD%
echo.

REM Basic checks
where go >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 找不到 Go。請先安裝 Go（建議 Go 1.25.5+）。
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 找不到 Node.js。請先安裝 Node.js（建議 Node 22.2.0+）。
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 找不到 npm。請確認 Node.js 安裝完整（含 npm）。
  pause
  exit /b 1
)

REM Go sqlite3 uses CGO on Windows; warn if gcc not found
where gcc >nul 2>nul
if errorlevel 1 (
  echo [WARN] 找不到 GCC（C compiler）。
  echo 後端使用 go-sqlite3（CGO），在 Windows 從原始碼啟動通常需要 GCC。
  echo 若稍後後端視窗出現 gcc/cgo 相關錯誤，請先安裝 TDM-GCC 或 MinGW。
  echo.
)

echo Starting backend...
start "DuelLog API" cmd /k "cd /d ""%~dp0apps\api"" && echo [API] Starting... && go run ."

echo Starting frontend...
start "DuelLog Web" cmd /k "cd /d ""%~dp0apps\web"" && if not exist node_modules (echo [WEB] Installing dependencies... && (if exist package-lock.json (npm ci) else (npm install))) && echo [WEB] Starting... && npm run dev"

echo Opening browser...
echo 若頁面尚未就緒，請稍等 5~10 秒後重新整理。
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173/history"

echo.
echo 已啟動兩個視窗：DuelLog API 與 DuelLog Web。
echo 若要停止服務，直接關閉那兩個視窗即可。
echo.
pause
popd
endlocal
