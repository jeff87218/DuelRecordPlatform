package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

func main() {
	payload := map[string]interface{}{
		"gameKey":    "master_duel",
		"seasonCode": "S49",
		"date":       "2026-01-13",
		"rank":       "鑽石 I",
		"myDeck": map[string]interface{}{
			"main": "蛇眼",
			"sub":  nil,
		},
		"oppDeck": map[string]interface{}{
			"main": "天盃",
			"sub":  nil,
		},
		"playOrder": "先攻",
		"result":    "W",
	}

	jsonData, _ := json.Marshal(payload)
	fmt.Printf("發送資料: %s\n", string(jsonData))

	resp, err := http.Post("http://localhost:8080/matches", "application/json", bytes.NewReader(jsonData))
	if err != nil {
		log.Fatal("請求失敗:", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("回應狀態: %d\n", resp.StatusCode)
	fmt.Printf("回應內容: %s\n", string(body))
}
