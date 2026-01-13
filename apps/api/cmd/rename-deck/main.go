package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

func main() {
	var err error
	db, err = sql.Open("sqlite3", "./duellog.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if len(os.Args) < 3 {
		// 互動模式
		fmt.Println("=== 牌組重命名工具 ===")
		fmt.Println("用法: go run main.go <舊名稱> <新名稱>")
		fmt.Println("")
		fmt.Println("或者輸入要重命名的牌組：")
		
		reader := bufio.NewReader(os.Stdin)
		
		fmt.Print("舊名稱: ")
		oldName, _ := reader.ReadString('\n')
		oldName = strings.TrimSpace(oldName)
		
		fmt.Print("新名稱: ")
		newName, _ := reader.ReadString('\n')
		newName = strings.TrimSpace(newName)
		
		if oldName == "" || newName == "" {
			fmt.Println("名稱不能為空")
			return
		}
		
		renameDeck(oldName, newName)
	} else {
		oldName := os.Args[1]
		newName := os.Args[2]
		renameDeck(oldName, newName)
	}
}

func renameDeck(oldName, newName string) {
	fmt.Printf("\n重命名: [%s] → [%s]\n", oldName, newName)
	
	// 檢查舊名稱是否存在
	var count int
	db.QueryRow("SELECT COUNT(*) FROM decks WHERE main = ? OR sub = ?", oldName, oldName).Scan(&count)
	if count == 0 {
		// 也檢查 deck_templates
		db.QueryRow("SELECT COUNT(*) FROM deck_templates WHERE main = ?", oldName).Scan(&count)
		if count == 0 {
			fmt.Printf("  ⚠️ 找不到名稱為 [%s] 的牌組\n", oldName)
			return
		}
	}
	
	// 開始事務
	tx, err := db.Begin()
	if err != nil {
		log.Fatal(err)
	}
	defer tx.Rollback()
	
	// 1. 更新 deck_templates
	result, err := tx.Exec("UPDATE deck_templates SET main = ? WHERE main = ?", newName, oldName)
	if err != nil {
		fmt.Printf("  ❌ 更新 deck_templates 失敗: %v\n", err)
		return
	}
	rows1, _ := result.RowsAffected()
	fmt.Printf("  ✓ deck_templates: %d 筆\n", rows1)
	
	// 2. 更新 decks 表的 main 欄位
	result, err = tx.Exec("UPDATE decks SET main = ? WHERE main = ?", newName, oldName)
	if err != nil {
		fmt.Printf("  ❌ 更新 decks.main 失敗: %v\n", err)
		return
	}
	rows2, _ := result.RowsAffected()
	fmt.Printf("  ✓ decks.main: %d 筆\n", rows2)
	
	// 3. 更新 decks 表的 sub 欄位
	result, err = tx.Exec("UPDATE decks SET sub = ? WHERE sub = ?", newName, oldName)
	if err != nil {
		fmt.Printf("  ❌ 更新 decks.sub 失敗: %v\n", err)
		return
	}
	rows3, _ := result.RowsAffected()
	fmt.Printf("  ✓ decks.sub: %d 筆\n", rows3)
	
	// 提交事務
	if err := tx.Commit(); err != nil {
		fmt.Printf("  ❌ 提交失敗: %v\n", err)
		return
	}
	
	total := rows1 + rows2 + rows3
	fmt.Printf("\n✅ 重命名完成！共更新 %d 筆記錄\n", total)
}
