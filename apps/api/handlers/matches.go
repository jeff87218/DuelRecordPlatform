package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/harvc/duellog/apps/api/models"
)

// MatchesHandler 處理 matches 相關請求
type MatchesHandler struct {
	db *sql.DB
}

// NewMatchesHandler 建立新的 matches handler
func NewMatchesHandler(db *sql.DB) *MatchesHandler {
	return &MatchesHandler{db: db}
}

// GetMatches 查詢對局列表 (GET /matches)
func (h *MatchesHandler) GetMatches(c *fiber.Ctx) error {
	// 取得查詢參數
	seasonCode := c.Query("seasonCode")
	mode := c.Query("mode")
	myDeckMain := c.Query("myDeckMain")
	oppDeckMain := c.Query("oppDeckMain")
	result := c.Query("result")
	playOrder := c.Query("playOrder")
	dateFrom := c.Query("dateFrom")
	dateTo := c.Query("dateTo")

	// 建立基礎 SQL 查詢（JOIN 取得完整資訊）
	query := `
		SELECT 
			m.id,
			m.date,
			m.mode,
			m.rank,
			m.play_order,
			m.result,
			m.note,
			m.created_at,
			m.updated_at,
			s.code as season_code,
			my_deck.id as my_deck_id,
			my_deck.main as my_deck_main,
			my_deck.sub as my_deck_sub,
			opp_deck.id as opp_deck_id,
			opp_deck.main as opp_deck_main,
			opp_deck.sub as opp_deck_sub
		FROM matches m
		JOIN seasons s ON m.season_id = s.id
		JOIN decks my_deck ON m.my_deck_id = my_deck.id
		JOIN decks opp_deck ON m.opp_deck_id = opp_deck.id
		WHERE 1=1
	`

	// 動態加入篩選條件（SQLite 使用 ? 佔位符）
	args := []interface{}{}

	if seasonCode != "" {
		query += " AND s.code = ?"
		args = append(args, seasonCode)
	}

	if mode != "" {
		query += " AND m.mode = ?"
		args = append(args, mode)
	}

	if myDeckMain != "" {
		query += " AND my_deck.main = ?"
		args = append(args, myDeckMain)
	}

	if oppDeckMain != "" {
		query += " AND opp_deck.main = ?"
		args = append(args, oppDeckMain)
	}

	if result != "" {
		query += " AND m.result = ?"
		args = append(args, result)
	}

	if playOrder != "" {
		query += " AND m.play_order = ?"
		args = append(args, playOrder)
	}

	if dateFrom != "" {
		query += " AND m.date >= ?"
		args = append(args, dateFrom)
	}

	if dateTo != "" {
		query += " AND m.date <= ?"
		args = append(args, dateTo)
	}

	// 按日期排序（最新在前）
	query += " ORDER BY m.date DESC, m.created_at DESC"

	// 執行查詢
	rows, err := h.db.Query(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "查詢失敗", "details": err.Error()})
	}
	defer rows.Close()

	// 解析結果
	matches := []models.MatchWithDetails{}
	for rows.Next() {
		var m models.MatchWithDetails
		var myDeckSub, oppDeckSub, note sql.NullString

		err := rows.Scan(
			&m.ID,
			&m.Date,
			&m.Mode,
			&m.Rank,
			&m.PlayOrder,
			&m.Result,
			&note,
			&m.CreatedAt,
			&m.UpdatedAt,
			&m.SeasonCode,
			&m.MyDeck.ID,
			&m.MyDeck.Main,
			&myDeckSub,
			&m.OppDeck.ID,
			&m.OppDeck.Main,
			&oppDeckSub,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "解析資料失敗", "details": err.Error()})
		}

		// 處理 nullable 欄位
		if myDeckSub.Valid {
			m.MyDeck.Sub = &myDeckSub.String
		}
		if oppDeckSub.Valid {
			m.OppDeck.Sub = &oppDeckSub.String
		}
		if note.Valid {
			m.Note = &note.String
		}

		matches = append(matches, m)
	}

	return c.JSON(fiber.Map{
		"matches": matches,
		"total":   len(matches),
	})
}

// CreateMatch 新增對局 (POST /matches)
func (h *MatchesHandler) CreateMatch(c *fiber.Ctx) error {
	var req models.CreateMatchRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "請求格式錯誤", "details": err.Error()})
	}

	// 驗證必要欄位
	if req.GameKey == "" || req.SeasonCode == "" || req.Date == "" {
		return c.Status(400).JSON(fiber.Map{"error": "缺少必要欄位"})
	}

	if req.Mode == "" {
		req.Mode = "Ranked"
	}
	if req.Mode != "Ranked" && req.Rank == "" {
		req.Rank = "—"
	}

	// 取得 game_id
	var gameID string
	err := h.db.QueryRow("SELECT id FROM games WHERE key = ?", req.GameKey).Scan(&gameID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "找不到遊戲", "gameKey": req.GameKey})
	}

	// 取得 season_id
	seasonID, err := h.getOrCreateSeasonID(gameID, req.SeasonCode)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "處理賽季失敗", "details": err.Error()})
	}

	// 取得或建立我的牌組
	myDeckID, err := h.findOrCreateDeck(gameID, req.MyDeck.Main, req.MyDeck.Sub)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "處理我的牌組失敗", "details": err.Error()})
	}

	// 取得或建立對手牌組
	oppDeckID, err := h.findOrCreateDeck(gameID, req.OppDeck.Main, req.OppDeck.Sub)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "處理對手牌組失敗", "details": err.Error()})
	}

	// 生成新的 match ID
	matchID := uuid.New().String()

	// 取得預設 user_id（MVP 單人模式）
	var userID string
	err = h.db.QueryRow("SELECT id FROM users LIMIT 1").Scan(&userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "找不到使用者"})
	}

	// 插入對局記錄
	_, err = h.db.Exec(`
		INSERT INTO matches (
			id, user_id, game_id, season_id, date, mode, rank,
			my_deck_id, opp_deck_id, play_order, result, note,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		matchID, userID, gameID, seasonID, req.Date, req.Mode, req.Rank,
		myDeckID, oppDeckID, req.PlayOrder, req.Result, req.Note,
		time.Now(), time.Now(),
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "新增對局失敗", "details": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{
		"id":      matchID,
		"message": "對局新增成功",
	})
}

// UpdateMatch 更新對局 (PATCH /matches/:id)
func (h *MatchesHandler) UpdateMatch(c *fiber.Ctx) error {
	matchID := c.Params("id")
	if matchID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "缺少對局 ID"})
	}

	var req models.UpdateMatchRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "請求格式錯誤", "details": err.Error()})
	}

	// 檢查對局是否存在
	var exists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM matches WHERE id = ?)", matchID).Scan(&exists)
	if err != nil || !exists {
		return c.Status(404).JSON(fiber.Map{"error": "找不到對局"})
	}

	// 動態建立更新語句
	updates := []string{}
	args := []interface{}{}

	if req.Date != nil {
		updates = append(updates, "date = ?")
		args = append(args, *req.Date)
	}
	if req.Mode != nil {
		updates = append(updates, "mode = ?")
		args = append(args, *req.Mode)
		// If switching away from Ranked and no explicit rank provided, set rank to '—' to satisfy NOT NULL.
		if *req.Mode != "Ranked" && req.Rank == nil {
			updates = append(updates, "rank = ?")
			args = append(args, "—")
		}
	}
	if req.Rank != nil {
		updates = append(updates, "rank = ?")
		args = append(args, *req.Rank)
	}
	if req.PlayOrder != nil {
		updates = append(updates, "play_order = ?")
		args = append(args, *req.PlayOrder)
	}
	if req.Result != nil {
		updates = append(updates, "result = ?")
		args = append(args, *req.Result)
	}
	if req.Note != nil {
		updates = append(updates, "note = ?")
		args = append(args, *req.Note)
	}

	// TODO: 處理 MyDeck 和 OppDeck 的更新（需要 findOrCreateDeck）

	if len(updates) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "沒有要更新的欄位"})
	}

	// 加入 updated_at
	updates = append(updates, "updated_at = ?")
	args = append(args, time.Now())

	// 加入 WHERE 條件
	args = append(args, matchID)

	// 執行更新
	query := fmt.Sprintf("UPDATE matches SET %s WHERE id = ?", joinStrings(updates, ", "))
	_, err = h.db.Exec(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "更新失敗", "details": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "對局更新成功",
		"id":      matchID,
	})
}

// DeleteMatch 刪除對局 (DELETE /matches/:id)
func (h *MatchesHandler) DeleteMatch(c *fiber.Ctx) error {
	matchID := c.Params("id")
	if matchID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "缺少對局 ID"})
	}

	// 執行刪除
	result, err := h.db.Exec("DELETE FROM matches WHERE id = ?", matchID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "刪除失敗", "details": err.Error()})
	}

	// 檢查是否有刪除任何記錄
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "找不到對局"})
	}

	return c.JSON(fiber.Map{
		"message": "對局刪除成功",
		"id":      matchID,
	})
}

// findOrCreateDeck 尋找或建立牌組
func (h *MatchesHandler) findOrCreateDeck(gameID, main string, sub *string) (string, error) {
	var deckID string
	var subValue sql.NullString

	if sub != nil {
		subValue.String = *sub
		subValue.Valid = true
	}

	// 先嘗試尋找
	var query string
	if sub == nil {
		query = "SELECT id FROM decks WHERE game_id = ? AND main = ? AND sub IS NULL"
		err := h.db.QueryRow(query, gameID, main).Scan(&deckID)
		if err == nil {
			return deckID, nil // 找到了
		}
	} else {
		query = "SELECT id FROM decks WHERE game_id = ? AND main = ? AND sub = ?"
		err := h.db.QueryRow(query, gameID, main, *sub).Scan(&deckID)
		if err == nil {
			return deckID, nil // 找到了
		}
	}

	// 沒找到，建立新的
	deckID = uuid.New().String()
	_, err := h.db.Exec(
		"INSERT INTO decks (id, game_id, main, sub) VALUES (?, ?, ?, ?)",
		deckID, gameID, main, subValue,
	)
	if err != nil {
		return "", err
	}

	// 同時確保 deck_templates 中有這個牌組（用於顏色顯示）
	h.ensureDeckTemplate(gameID, main)
	if sub != nil && *sub != "" && *sub != "無" {
		h.ensureDeckTemplate(gameID, *sub)
	}

	return deckID, nil
}

// ensureDeckTemplate 確保牌組模板存在，不存在則建立（預設主題為「無」）
func (h *MatchesHandler) ensureDeckTemplate(gameID, deckName string) {
	// 檢查是否已存在
	var exists bool
	err := h.db.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM deck_templates WHERE game_id = ? AND main = ? AND deck_type = 'main')",
		gameID,
		deckName,
	).Scan(&exists)
	if err != nil || exists {
		return // 已存在或查詢失敗，不需要建立
	}

	// 不存在，建立新的模板（預設主題為「無」= 灰色）
	templateID := "tpl-auto-" + uuid.New().String()[:8]
	_, _ = h.db.Exec(`
		INSERT INTO deck_templates (id, game_id, main, theme, deck_type, created_at)
		VALUES (?, ?, ?, '無', 'main', CURRENT_TIMESTAMP)
	`, templateID, gameID, deckName)
}

func (h *MatchesHandler) getOrCreateSeasonID(gameID, seasonCode string) (string, error) {
	var seasonID string
	err := h.db.QueryRow("SELECT id FROM seasons WHERE code = ? AND game_id = ?", seasonCode, gameID).Scan(&seasonID)
	if err == nil {
		return seasonID, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}

	// Not found: auto-create so users can start recording immediately.
	seasonID = uuid.New().String()

	// If seasonCode looks like YYYY-MM, fill start/end dates; otherwise leave them NULL.
	var startDate any = nil
	var endDate any = nil
	if t, parseErr := time.Parse("2006-01", seasonCode); parseErr == nil {
		start := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
		end := start.AddDate(0, 1, 0).AddDate(0, 0, -1)
		startDate = start.Format("2006-01-02")
		endDate = end.Format("2006-01-02")
	}

	_, err = h.db.Exec(
		"INSERT INTO seasons (id, game_id, code, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
		seasonID, gameID, seasonCode, startDate, endDate,
	)
	if err != nil {
		// If another request created it concurrently, just re-read.
		if readErr := h.db.QueryRow("SELECT id FROM seasons WHERE code = ? AND game_id = ?", seasonCode, gameID).Scan(&seasonID); readErr == nil {
			return seasonID, nil
		}
		return "", err
	}

	return seasonID, nil
}

// joinStrings 連接字串陣列（輔助函數）
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
