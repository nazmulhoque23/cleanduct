// Package config loads runtime settings from environment variables
// (with sensible defaults for local development).
package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	"ductcleaning/internal/models"
)

type Config struct {
	Addr       string // ":8080"
	DBPath     string // "./data/site.db"
	StaticDir  string // path to built frontend; empty = API only
	CORSOrigin string // dev frontend origin, e.g. http://localhost:5173
	AdminToken string // bearer token for /api/admin/*; empty disables admin routes

	// Notifications (all optional; see notify package).
	ResendAPIKey string
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPass     string
	NotifyFrom   string
	NotifyTo     string
	TwilioSID    string
	TwilioToken  string
	TwilioFrom   string
	TwilioTo     string

	// Public site URL (no trailing slash) for canonical links, sitemap and OG tags.
	PublicURL string

	// Online booking.
	BookingCapacity int // bookings accepted per time window per day
	BookingDays     int // how many days ahead customers may book
	BookingLeadDays int // earliest bookable day = today + this
	BookingWindows  []string
	BookingClosed   []time.Weekday

	Site models.SiteInfo
}

func Load() Config {
	c := Config{
		Addr:         env("ADDR", ":8080"),
		DBPath:       env("DB_PATH", "./data/site.db"),
		StaticDir:    env("STATIC_DIR", ""),
		CORSOrigin:   env("CORS_ORIGIN", "http://localhost:5173"),
		AdminToken:   env("ADMIN_TOKEN", ""),
		ResendAPIKey: env("RESEND_API_KEY", ""),
		SMTPHost:     env("SMTP_HOST", ""),
		SMTPPort:     envInt("SMTP_PORT", 587),
		SMTPUser:     env("SMTP_USER", ""),
		SMTPPass:     env("SMTP_PASS", ""),
		NotifyFrom:   env("NOTIFY_FROM", "leads@example.com"),
		NotifyTo:     env("NOTIFY_TO", ""),
		TwilioSID:    env("TWILIO_SID", ""),
		TwilioToken:  env("TWILIO_TOKEN", ""),
		TwilioFrom:   env("TWILIO_FROM", ""),
		TwilioTo:     env("TWILIO_TO", ""),
		PublicURL:    strings.TrimRight(env("PUBLIC_URL", "http://localhost:8080"), "/"),

		BookingCapacity: envInt("BOOKING_CAPACITY", 2),
		BookingDays:     envInt("BOOKING_DAYS", 14),
		BookingLeadDays: envInt("BOOKING_LEAD_DAYS", 1),
		BookingWindows:  strings.Split(env("BOOKING_WINDOWS", "08:00-10:00|10:00-12:00|12:00-14:00|14:00-16:00|16:00-18:00"), "|"),
		BookingClosed:   []time.Weekday{time.Sunday},
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
