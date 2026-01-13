package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db, err := sql.Open("sqlite3", "./duellog.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 取得正確的 game_id
	var gameID string
	err = db.QueryRow("SELECT id FROM games WHERE key = 'master_duel'").Scan(&gameID)
	if err != nil {
		log.Fatal("找不到遊戲:", err)
	}
	fmt.Printf("Game ID: %s\n", gameID)

	// 檢查 S49 是否存在
	var existingID string
	err = db.QueryRow("SELECT id FROM seasons WHERE code = 'S49' AND game_id = ?", gameID).Scan(&existingID)
	if err == nil {
		fmt.Printf("S49 賽季已存在: %s\n", existingID)
		return
	}

	// 建立 S49 (2026年1月)
	seasonID := uuid.New().String()
	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 1, 31, 23, 59, 59, 0, time.UTC)

	_, err = db.Exec(`
		INSERT INTO seasons (id, game_id, code, start_date, end_date)
		VALUES (?, ?, 'S49', ?, ?)
	`, seasonID, gameID, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	if err != nil {
		log.Fatal("建立 S49 賽季失敗:", err)
	}

	fmt.Printf("✓ 建立 S49 賽季成功: %s\n", seasonID)
}
