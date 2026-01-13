package main

import (
	"database/sql"
	"fmt"
	"log"
	"unicode/utf8"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db, err := sql.Open("sqlite3", "./duellog.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 找出有問題的牌組模板（名稱太短或包含無效 UTF-8）
	fmt.Println("檢查異常資料:")
	rows, err := db.Query("SELECT id, main FROM deck_templates")
	if err != nil {
		log.Fatal(err)
	}

	var badIDs []string
	for rows.Next() {
		var id, name string
		rows.Scan(&id, &name)
		// 檢查是否有異常
		if len(name) < 2 || !utf8.ValidString(name) {
			fmt.Printf("  發現異常: id=%s, name=[%s], bytes=%v\n", id, name, []byte(name))
			badIDs = append(badIDs, id)
		}
	}
	rows.Close()

	if len(badIDs) == 0 {
		fmt.Println("  無異常資料")
		return
	}

	// 刪除異常資料
	fmt.Printf("\n刪除 %d 筆異常資料...\n", len(badIDs))
	for _, id := range badIDs {
		_, err := db.Exec("DELETE FROM deck_templates WHERE id = ?", id)
		if err != nil {
			fmt.Printf("  刪除 %s 失敗: %v\n", id, err)
		} else {
			fmt.Printf("  已刪除: %s\n", id)
		}
	}

	fmt.Println("\n✓ 清理完成!")
}
