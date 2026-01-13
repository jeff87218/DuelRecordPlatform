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

	// 取得正確的 game_id
	var correctGameID string
	err = db.QueryRow("SELECT id FROM games WHERE key = 'master_duel'").Scan(&correctGameID)
	if err != nil {
		log.Fatal("找不到遊戲:", err)
	}
	fmt.Printf("正確的 game_id: %s\n", correctGameID)

	// 更新 seasons 表
	result, err := db.Exec("UPDATE seasons SET game_id = ?", correctGameID)
	if err != nil {
		log.Fatal("更新 seasons 失敗:", err)
	}
	rows, _ := result.RowsAffected()
	fmt.Printf("更新 seasons: %d 筆\n", rows)

	// 更新 matches 表
	result, err = db.Exec("UPDATE matches SET game_id = ?", correctGameID)
	if err != nil {
		log.Fatal("更新 matches 失敗:", err)
	}
	rows, _ = result.RowsAffected()
	fmt.Printf("更新 matches: %d 筆\n", rows)

	// 更新 decks 表
	result, err = db.Exec("UPDATE decks SET game_id = ?", correctGameID)
	if err != nil {
		log.Fatal("更新 decks 失敗:", err)
	}
	rows, _ = result.RowsAffected()
	fmt.Printf("更新 decks: %d 筆\n", rows)

	// 更新 deck_templates 表
	result, err = db.Exec("UPDATE deck_templates SET game_id = ?", correctGameID)
	if err != nil {
		log.Fatal("更新 deck_templates 失敗:", err)
	}
	rows, _ = result.RowsAffected()
	fmt.Printf("更新 deck_templates: %d 筆\n", rows)

	fmt.Println("\n✓ 修復完成!")
}
