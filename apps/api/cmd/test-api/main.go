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

	// 檢查有問題的資料
	fmt.Println("檢查所有牌組模板名稱（按名稱排序）:")
	rows, err := db.Query("SELECT main, theme FROM deck_templates ORDER BY main ASC")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var name, theme string
		rows.Scan(&name, &theme)
		// 檢查是否有異常（名稱長度小於2或大於20，或包含問號）
		if len(name) < 2 || len(name) > 20 {
			fmt.Printf("  異常: [%s] (長度: %d, 主題: %s, bytes: %v)\n", name, len(name), theme, []byte(name))
		}
		count++
	}
	fmt.Printf("\n總共 %d 個模板\n", count)

	// 列出前 10 筆按字母排序的資料
	fmt.Println("\n前 10 筆（按名稱排序）:")
	rows2, _ := db.Query("SELECT main, theme FROM deck_templates ORDER BY main ASC LIMIT 10")
	defer rows2.Close()
	for rows2.Next() {
		var name, theme string
		rows2.Scan(&name, &theme)
		fmt.Printf("  [%s] bytes: %v\n", name, []byte(name))
	}
}
