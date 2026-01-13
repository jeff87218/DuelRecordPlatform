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

	// 檢查 deck_templates 表結構
	fmt.Println("Deck Templates 表結構:")
	rows, err := db.Query("PRAGMA table_info(deck_templates)")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var dfltValue sql.NullString
		rows.Scan(&cid, &name, &colType, &notNull, &dfltValue, &pk)
		fmt.Printf("  %d: %s (%s)\n", cid, name, colType)
	}

	// 檢查 deck_templates 資料（前 20 筆）
	fmt.Println("\nDeck Templates 資料 (前 20 筆):")
	rows2, err := db.Query("SELECT * FROM deck_templates LIMIT 20")
	if err != nil {
		log.Fatal(err)
	}
	defer rows2.Close()

	cols, _ := rows2.Columns()
	fmt.Printf("  欄位: %v\n", cols)

	for rows2.Next() {
		values := make([]interface{}, len(cols))
		valuePtrs := make([]interface{}, len(cols))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		rows2.Scan(valuePtrs...)
		fmt.Printf("  資料: %v\n", values)
	}
}
