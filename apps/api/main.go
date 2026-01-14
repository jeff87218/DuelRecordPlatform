package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/harvc/duellog/apps/api/handlers"
	"github.com/joho/godotenv"
	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

func main() {
	// 載入 .env 檔案
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// 初始化 SQLite 資料庫
	var err error
	dbPath := getEnv("DB_PATH", "./duellog.db")
	db, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// 測試資料庫連線
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}
	log.Println("✓ Database connected successfully")

	// Ensure schema is up-to-date for local SQLite files.
	if err := ensureSchema(db); err != nil {
		log.Fatal("Failed to ensure schema:", err)
	}

	// 建立 Fiber app
	app := fiber.New(fiber.Config{
		AppName: "DuelLog API v1.0",
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: getEnv("CORS_ORIGINS", "http://localhost:5173"),
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	// Routes
	app.Get("/health", healthHandler)

	// Matches API
	matchesHandler := handlers.NewMatchesHandler(db)
	app.Get("/matches", matchesHandler.GetMatches)
	app.Post("/matches", matchesHandler.CreateMatch)
	app.Patch("/matches/:id", matchesHandler.UpdateMatch)
	app.Delete("/matches/:id", matchesHandler.DeleteMatch)

	// Deck Templates API
	app.Get("/deck-templates", func(c *fiber.Ctx) error { return handlers.GetDeckTemplates(c, db) })
	app.Post("/deck-templates", func(c *fiber.Ctx) error { return handlers.CreateDeckTemplate(c, db) })
	app.Patch("/deck-templates/:id", func(c *fiber.Ctx) error { return handlers.UpdateDeckTemplate(c, db) })
	app.Delete("/deck-templates/:id", func(c *fiber.Ctx) error { return handlers.DeleteDeckTemplate(c, db) })

	// 啟動伺服器
	port := getEnv("PORT", "8080")
	log.Printf("🚀 Server starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func healthHandler(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "DuelLog API is running",
		"db":      "connected",
	})
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func ensureSchema(db *sql.DB) error {
	// Ensure base tables exist for a fresh DB.
	exists, err := tableExists(db, "matches")
	if err != nil {
		return err
	}
	if !exists {
		log.Println("ℹ️  Database is empty (no tables yet); applying base schema migrations...")
		if err := applyBaseMigrations(db); err != nil {
			return fmt.Errorf("apply base migrations: %w", err)
		}
		log.Println("✓ Base schema is ready")
	}

	// Add matches.mode if missing (older DBs).
	cols, err := getTableColumns(db, "matches")
	if err != nil {
		return err
	}
	if _, ok := cols["mode"]; !ok {
		if _, err := db.Exec("ALTER TABLE matches ADD COLUMN mode TEXT NOT NULL DEFAULT 'Ranked' CHECK (mode IN ('Ranked','Rating','DC'))"); err != nil {
			return fmt.Errorf("add matches.mode: %w", err)
		}
		if _, err := db.Exec("CREATE INDEX IF NOT EXISTS idx_matches_mode ON matches(mode)"); err != nil {
			return fmt.Errorf("create idx_matches_mode: %w", err)
		}
		log.Println("✓ Applied runtime migration: matches.mode")
	}

	return nil
}

func tableExists(db *sql.DB, table string) (bool, error) {
	var name string
	err := db.QueryRow(
		"SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1",
		table,
	).Scan(&name)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return strings.EqualFold(name, table), nil
}

func applyBaseMigrations(db *sql.DB) error {
	// These migrations create the initial schema + deck_templates.
	// We keep this lightweight so a new user can simply run `go run .`.
	migrationFiles := []string{
		"001_create_schema.sql",
		"002_add_deck_theme.sql",
		"003_add_match_mode.sql",
	}

	for _, f := range migrationFiles {
		contents, err := readMigrationFile(f)
		if err != nil {
			return err
		}
		if _, err := db.Exec(contents); err != nil {
			return fmt.Errorf("exec %s: %w", f, err)
		}
	}

	return nil
}

func readMigrationFile(filename string) (string, error) {
	// Try common working directories:
	// - when running from apps/api: ./migrations/<file>
	// - when running from repo root: ./apps/api/migrations/<file>
	candidates := []string{
		filepath.Join("migrations", filename),
		filepath.Join("apps", "api", "migrations", filename),
	}
	var lastErr error
	for _, p := range candidates {
		b, err := os.ReadFile(p)
		if err == nil {
			return string(b), nil
		}
		lastErr = err
	}
	return "", fmt.Errorf("read migration %s: %w", filename, lastErr)
}

func getTableColumns(db *sql.DB, table string) (map[string]struct{}, error) {
	rows, err := db.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols := map[string]struct{}{}
	for rows.Next() {
		var cid int
		var name string
		var ctype string
		var notnull int
		var dflt sql.NullString
		var pk int
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return nil, err
		}
		cols[name] = struct{}{}
	}
	return cols, rows.Err()
}
