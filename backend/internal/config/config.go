// Package config loads runtime settings from environment variables
// (with sensible defaults for local development).
package config

import (
	"os"
	"strconv"
	"strings"

	"ductcleaning/internal/models"
)

type Config struct {
	Addr       string // ":8080"
	DBPath     string // "./data/site.db"
	StaticDir  string // path to built frontend; empty = API only
	CORSOrigin string // dev frontend origin, e.g. http://localhost:5173
	AdminToken string // bearer token for /api/admin/*; empty disables admin routes

	// Optional SMTP for lead notifications. If SMTPHost is empty, leads are
	// only logged.
	SMTPHost   string
	SMTPPort   int
	SMTPUser   string
	SMTPPass   string
	NotifyFrom string
	NotifyTo   string

	Site models.SiteInfo
}

func Load() Config {
	c := Config{
		Addr:       env("ADDR", ":8080"),
		DBPath:     env("DB_PATH", "./data/site.db"),
		StaticDir:  env("STATIC_DIR", ""),
		CORSOrigin: env("CORS_ORIGIN", "http://localhost:5173"),
		AdminToken: env("ADMIN_TOKEN", ""),
		SMTPHost:   env("SMTP_HOST", ""),
		SMTPPort:   envInt("SMTP_PORT", 587),
		SMTPUser:   env("SMTP_USER", ""),
		SMTPPass:   env("SMTP_PASS", ""),
		NotifyFrom: env("NOTIFY_FROM", "leads@example.com"),
		NotifyTo:   env("NOTIFY_TO", "owner@example.com"),
	}

	// Placeholder business identity — override via env for the real company.
	c.Site.Name = env("SITE_NAME", "CleanDuct")
	c.Site.Tagline = env("SITE_TAGLINE", "Cleaner air. Safer home. Honest pricing.")
	c.Site.Phone = env("SITE_PHONE", "(312) 555-0148")
	c.Site.PhoneHref = "tel:+1" + digitsOnly(c.Site.Phone)
	c.Site.Email = env("SITE_EMAIL", "hello@cleanduct.example")
	c.Site.Address = env("SITE_ADDRESS", "7 N Roselle Rd, Schaumburg, IL 60193")
	c.Site.Hours = strings.Split(env("SITE_HOURS", "Mon–Fri 7:00 AM – 8:00 PM|Sat 8:00 AM – 6:00 PM|Sun Closed"), "|")
	c.Site.Rating = envFloat("SITE_RATING", 4.9)
	c.Site.ReviewCount = envInt("SITE_REVIEW_COUNT", 1284)
	c.Site.YearFounded = envInt("SITE_YEAR_FOUNDED", 2011)
	c.Site.Social.Facebook = env("SOCIAL_FACEBOOK", "#")
	c.Site.Social.Instagram = env("SOCIAL_INSTAGRAM", "#")
	c.Site.Social.YouTube = env("SOCIAL_YOUTUBE", "#")
	c.Site.Social.Google = env("SOCIAL_GOOGLE", "#")
	return c
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func envFloat(key string, def float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return def
}

func digitsOnly(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
