package main

import (
	"database/sql"
	"encoding/csv"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

// 階級轉換映射
var rankMapping = map[string]string{
	"銅5": "銅 V", "銅4": "銅 IV", "銅3": "銅 III", "銅2": "銅 II", "銅1": "銅 I",
	"銀5": "銀 V", "銀4": "銀 IV", "銀3": "銀 III", "銀2": "銀 II", "銀1": "銀 I",
	"金5": "金 V", "金4": "金 IV", "金3": "金 III", "金2": "金 II", "金1": "金 I",
	"白金5": "白金 V", "白金4": "白金 IV", "白金3": "白金 III", "白金2": "白金 II", "白金1": "白金 I",
	"鑽5": "鑽石 V", "鑽4": "鑽石 IV", "鑽3": "鑽石 III", "鑽2": "鑽石 II", "鑽1": "鑽石 I",
	"大師5": "大師 V", "大師4": "大師 IV", "大師3": "大師 III", "大師2": "大師 II", "大師1": "大師 I",
}

func main() {
	// 開啟資料庫
	db, err := sql.Open("sqlite3", "./duellog.db")
	if err != nil {
		log.Fatal("無法開啟資料庫:", err)
	}
	defer db.Close()

	// ===== 清空現有資料 =====
	log.Println("清空現有資料...")
	db.Exec("DELETE FROM matches")
	db.Exec("DELETE FROM decks")
	db.Exec("DELETE FROM seasons WHERE id != 'season-s49'") // 保留當季
	db.Exec("DELETE FROM deck_templates")
	log.Println("✓ 資料已清空")

	// 開啟 CSV 檔案
	file, err := os.Open("./import.csv")
	if err != nil {
		log.Fatal("無法開啟 CSV 檔案 (請確認 import.csv 存在於 apps/api/ 資料夾):", err)
	}
	defer file.Close()

	// 讀取 CSV
	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		log.Fatal("無法讀取 CSV:", err)
	}

	if len(records) < 2 {
		log.Fatal("CSV 檔案沒有資料")
	}

	// 取得預設資料
	gameID := "game-md"
	var userID string
	err = db.QueryRow("SELECT id FROM users LIMIT 1").Scan(&userID)
	if err != nil {
		log.Fatal("找不到使用者:", err)
	}

	// 建立賽季快取
	seasonCache := make(map[string]string)

	// 跳過標題列，處理每一筆資料
	header := records[0]
	log.Printf("CSV 欄位: %v\n", header)
	log.Printf("共有 %d 筆資料待匯入\n", len(records)-1)

	successCount := 0
	errorCount := 0

	for i, row := range records[1:] {
		if len(row) < 11 {
			log.Printf("[%d] 欄位不足，跳過: %v", i+1, row)
			errorCount++
			continue
		}

		// 解析欄位 (根據你的格式)
		// Rank, Account, 本家(我方), 小軸(我方), 勝負, 先後攻, 本家(敵方), 小軸(敵方), 備註, Date, Season
		rankRaw := strings.TrimSpace(row[0])
		// account := row[1] // 不使用
		myMain := strings.TrimSpace(row[2])
		mySub := strings.TrimSpace(row[3])
		resultRaw := strings.TrimSpace(row[4])
		playOrder := strings.TrimSpace(row[5])
		oppMain := strings.TrimSpace(row[6])
		oppSub := strings.TrimSpace(row[7])
		note := strings.TrimSpace(row[8])
		dateRaw := strings.TrimSpace(row[9])
		seasonCode := strings.TrimSpace(row[10]) // 直接使用 CSV 中的 Season 欄位

		// 轉換階級格式
		rank, ok := rankMapping[rankRaw]
		if !ok {
			rank = rankRaw // 如果沒有映射，使用原始值
		}

		// 轉換勝負
		var result string
		if resultRaw == "O" || resultRaw == "勝" || resultRaw == "o" {
			result = "W"
		} else if resultRaw == "X" || resultRaw == "敗" || resultRaw == "x" {
			result = "L"
		} else {
			result = resultRaw
		}

		// 轉換日期格式 (2025/12/31 → 2025-12-31)
		date := strings.ReplaceAll(dateRaw, "/", "-")
		// 驗證日期格式
		_, err := time.Parse("2006-01-02", date)
		if err != nil {
			// 嘗試其他格式
			t, err2 := time.Parse("2006-1-2", date)
			if err2 != nil {
				log.Printf("[%d] 日期格式錯誤: %s", i+1, dateRaw)
				errorCount++
				continue
			}
			date = t.Format("2006-01-02")
		}

		// 處理副軸為空的情況
		if mySub == "" {
			mySub = "無"
		}
		if oppSub == "" {
			oppSub = "無"
		}

		// 取得或建立賽季 (使用 CSV 中的 seasonCode)
		seasonID, ok := seasonCache[seasonCode]
		if !ok {
			err := db.QueryRow("SELECT id FROM seasons WHERE code = ? AND game_id = ?", seasonCode, gameID).Scan(&seasonID)
			if err != nil {
				// 建立新賽季
				seasonID = "season-" + strings.ToLower(seasonCode)
				_, err = db.Exec(`
					INSERT INTO seasons (id, game_id, code, start_date, end_date)
					VALUES (?, ?, ?, ?, ?)
				`, seasonID, gameID, seasonCode, date, date)
				if err != nil {
					log.Printf("[%d] 建立賽季失敗: %v", i+1, err)
				} else {
					log.Printf("  → 建立賽季: %s", seasonCode)
				}
			}
			seasonCache[seasonCode] = seasonID
		}

		// 取得或建立我方牌組
		myDeckID, err := findOrCreateDeck(db, gameID, myMain, mySub)
		if err != nil {
			log.Printf("[%d] 建立我方牌組失敗: %v", i+1, err)
			errorCount++
			continue
		}

		// 取得或建立對手牌組
		oppDeckID, err := findOrCreateDeck(db, gameID, oppMain, oppSub)
		if err != nil {
			log.Printf("[%d] 建立對手牌組失敗: %v", i+1, err)
			errorCount++
			continue
		}

		// 插入對局記錄
		matchID := uuid.New().String()
		_, err = db.Exec(`
			INSERT INTO matches (
				id, user_id, game_id, season_id, date, rank,
				my_deck_id, opp_deck_id, play_order, result, note,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			matchID, userID, gameID, seasonID, date, rank,
			myDeckID, oppDeckID, playOrder, result, note,
			time.Now(), time.Now(),
		)
		if err != nil {
			log.Printf("[%d] 插入對局失敗: %v", i+1, err)
			errorCount++
			continue
		}

		successCount++
		if successCount%100 == 0 {
			log.Printf("已匯入 %d 筆...", successCount)
		}
	}

	log.Printf("\n========== 匯入完成 ==========")
	log.Printf("成功: %d 筆", successCount)
	log.Printf("失敗: %d 筆", errorCount)

	// 顯示賽季統計
	log.Println("\n賽季統計:")
	rows, _ := db.Query(`
		SELECT s.code, COUNT(m.id) as cnt 
		FROM seasons s 
		LEFT JOIN matches m ON s.id = m.season_id 
		GROUP BY s.id 
		ORDER BY s.code DESC
	`)
	for rows.Next() {
		var code string
		var cnt int
		rows.Scan(&code, &cnt)
		log.Printf("  %s: %d 筆", code, cnt)
	}
	rows.Close()

	log.Println("================================")
}

// findOrCreateDeck 尋找或建立牌組
func findOrCreateDeck(db *sql.DB, gameID, main, sub string) (string, error) {
	var deckID string

	// 先嘗試尋找
	err := db.QueryRow(
		"SELECT id FROM decks WHERE game_id = ? AND main = ? AND sub = ?",
		gameID, main, sub,
	).Scan(&deckID)
	if err == nil {
		return deckID, nil // 找到了
	}

	// 沒找到，建立新的
	deckID = uuid.New().String()
	_, err = db.Exec(
		"INSERT INTO decks (id, game_id, main, sub) VALUES (?, ?, ?, ?)",
		deckID, gameID, main, sub,
	)
	if err != nil {
		return "", err
	}

	// 確保 deck_templates 中有這個牌組（用於顏色顯示）
	ensureDeckTemplate(db, gameID, main)
	if sub != "" && sub != "無" {
		ensureDeckTemplate(db, gameID, sub)
	}

	return deckID, nil
}

// ensureDeckTemplate 確保牌組模板存在
func ensureDeckTemplate(db *sql.DB, gameID, deckName string) {
	var exists bool
	db.QueryRow("SELECT EXISTS(SELECT 1 FROM deck_templates WHERE main = ?)", deckName).Scan(&exists)
	if exists {
		return
	}

	// 建立新模板（預設主題為「無」= 灰色）
	templateID := "tpl-auto-" + uuid.New().String()[:8]
	db.Exec(`
		INSERT INTO deck_templates (id, game_id, main, theme, deck_type, created_at)
		VALUES (?, ?, ?, '無', 'main', CURRENT_TIMESTAMP)
	`, templateID, gameID, deckName)
	log.Printf("  → 自動建立牌組模板: %s (主題: 無)", deckName)
}
