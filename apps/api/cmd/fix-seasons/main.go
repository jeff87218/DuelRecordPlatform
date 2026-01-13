package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db, err := sql.Open("sqlite3", "./duellog.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 找出所有在 matches 中但不在 seasons 中的 season_id
	rows, err := db.Query(`
		SELECT DISTINCT m.season_id 
		FROM matches m 
		LEFT JOIN seasons s ON m.season_id = s.id 
		WHERE s.id IS NULL
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var missingSeasonsIDs []string
	for rows.Next() {
		var id string
		rows.Scan(&id)
		missingSeasonsIDs = append(missingSeasonsIDs, id)
	}

	fmt.Printf("找到 %d 個缺失的 season_id\n", len(missingSeasonsIDs))

	// 為每個缺失的 season 建立記錄
	// 由於原始的 season code 已經遺失，我們統一設為 "S48" 或從 matches 中推斷
	for i, seasonID := range missingSeasonsIDs {
		// 從該 season 的第一筆 match 取得日期作為參考
		var minDate, maxDate string
		db.QueryRow(`
			SELECT MIN(date), MAX(date) 
			FROM matches 
			WHERE season_id = ?
		`, seasonID).Scan(&minDate, &maxDate)

		// 建立 season 記錄
		code := fmt.Sprintf("S%d", 48-i) // 假設從 S48 往前推
		_, err := db.Exec(`
			INSERT INTO seasons (id, game_id, code, start_date, end_date)
			VALUES (?, 'game-md', ?, ?, ?)
		`, seasonID, code, minDate, maxDate)

		if err != nil {
			log.Printf("建立 season %s 失敗: %v", seasonID, err)
		} else {
			fmt.Printf("建立 season: %s (code: %s, 日期: %s ~ %s)\n", seasonID, code, minDate, maxDate)
		}
	}

	// 再次確認
	var totalSeasons int
	db.QueryRow("SELECT COUNT(*) FROM seasons").Scan(&totalSeasons)
	fmt.Printf("\n修復後 seasons 總數: %d\n", totalSeasons)

	// 確認 JOIN 後能查到的 matches 數量
	var joinedCount int
	db.QueryRow(`
		SELECT COUNT(*) 
		FROM matches m 
		JOIN seasons s ON m.season_id = s.id
	`).Scan(&joinedCount)
	fmt.Printf("JOIN 後可查詢的 matches 數量: %d\n", joinedCount)
}
