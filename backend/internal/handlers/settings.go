package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"ductcleaning/internal/models"
)

// Runtime settings: the environment provides defaults, rows in the `settings`
// table override them, and the owner edits those rows from Admin › Settings.
// Cached in memory; the cache is dropped whenever settings are saved.

type runtime struct {
	Site     models.SiteInfo
	Windows  []string
	Capacity int
	Days     int
	LeadDays int
}

// settingKeys is the editable set (and the order the admin UI shows them).
var settingKeys = []struct {
	Key, Label, Kind, Help string
}{
	{"site_name", "Business name", "text", "Shown in the header, emails and structured data."},
	{"site_tagline", "Tagline", "text", ""},
	{"site_phone", "Phone", "text", "Every call button uses this. Format: (312) 555-0148"},
	{"site_email", "Email", "text", ""},
	{"site_address", "Address", "text", "Street, City, ST ZIP — used for the map pin and Google structured data."},
	{"site_hours", "Hours", "text", "One line per day-range, separated by |. Example: Mon–Fri 7:00 AM – 8:00 PM|Sat 8:00 AM – 6:00 PM|Sun Closed"},
	{"site_rating", "Google rating", "number", "e.g. 4.9"},
	{"site_review_count", "Review count", "number", ""},
	{"site_year_founded", "Year founded", "number", ""},
	{"social_facebook", "Facebook URL", "text", ""},
	{"social_instagram", "Instagram URL", "text", ""},
	{"social_youtube", "YouTube URL", "text", ""},
	{"social_google", "Google Business Profile URL", "text", ""},
	{"booking_windows", "Arrival windows", "text", "Separated by |, 24h format. Example: 08:00-10:00|10:00-12:00|12:00-14:00|14:00-16:00|16:00-18:00"},
	{"booking_capacity", "Jobs per window", "number", "How many bookings you accept in each arrival window per day (number of crews)."},
	{"booking_days", "Days bookable ahead", "number", "How far into the future customers can book."},
	{"booking_lead_days", "Minimum notice (days)", "number", "0 = same-day bookings allowed, 1 = from tomorrow."},
}

var (
	rtMu    sync.RWMutex
	rtCache *runtime
)

func (s *Server) invalidateRuntime() {
	rtMu.Lock()
	rtCache = nil
	rtMu.Unlock()
}

// rt returns the effective settings (env defaults + DB overrides).
func (s *Server) rt() runtime {
	rtMu.RLock()
	if rtCache != nil {
		defer rtMu.RUnlock()
		return *rtCache
	}
	rtMu.RUnlock()

	r := runtime{
		Site: s.Cfg.Site, Windows: s.Cfg.BookingWindows, Capacity: s.Cfg.BookingCapacity,
		Days: s.Cfg.BookingDays, LeadDays: s.Cfg.BookingLeadDays,
	}
	over := s.loadSettings()
	str := func(k, cur string) string {
		if v, ok := over[k]; ok && strings.TrimSpace(v) != "" {
			return v
		}
		return cur
	}
	num := func(k string, cur int) int {
		if v, ok := over[k]; ok {
			if n, err := strconv.Atoi(strings.TrimSpace(v)); err == nil {
				return n
			}
		}
		return cur
	}
	r.Site.Name = str("site_name", r.Site.Name)
	r.Site.Tagline = str("site_tagline", r.Site.Tagline)
	r.Site.Phone = str("site_phone", r.Site.Phone)
	r.Site.PhoneHref = "tel:+1" + digits(r.Site.Phone)
	r.Site.Email = str("site_email", r.Site.Email)
	r.Site.Address = str("site_address", r.Site.Address)
	if v, ok := over["site_hours"]; ok && strings.TrimSpace(v) != "" {
		r.Site.Hours = strings.Split(v, "|")
	}
	if v, ok := over["site_rating"]; ok {
		if f, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
			r.Site.Rating = f
		}
	}
	r.Site.ReviewCount = num("site_review_count", r.Site.ReviewCount)
	r.Site.YearFounded = num("site_year_founded", r.Site.YearFounded)
	r.Site.Social.Facebook = str("social_facebook", r.Site.Social.Facebook)
	r.Site.Social.Instagram = str("social_instagram", r.Site.Social.Instagram)
	r.Site.Social.YouTube = str("social_youtube", r.Site.Social.YouTube)
	r.Site.Social.Google = str("social_google", r.Site.Social.Google)
	if v, ok := over["booking_windows"]; ok && strings.TrimSpace(v) != "" {
		r.Windows = strings.Split(v, "|")
	}
	r.Capacity = num("booking_capacity", r.Capacity)
	r.Days = num("booking_days", r.Days)
	r.LeadDays = num("booking_lead_days", r.LeadDays)

	rtMu.Lock()
	rtCache = &r
	rtMu.Unlock()
	return r
}

func (s *Server) loadSettings() map[string]string {
	out := map[string]string{}
	rows, err := s.DB.Query(`SELECT key, value FROM settings`)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err == nil {
			out[k] = v
		}
	}
	return out
}

// currentValues renders each key's effective value as text for the admin form.
func (s *Server) currentValues() map[string]string {
	r := s.rt()
	return map[string]string{
		"site_name": r.Site.Name, "site_tagline": r.Site.Tagline, "site_phone": r.Site.Phone, "site_email": r.Site.Email,
		"site_address": r.Site.Address, "site_hours": strings.Join(r.Site.Hours, "|"),
		"site_rating": strconv.FormatFloat(r.Site.Rating, 'f', 1, 64), "site_review_count": strconv.Itoa(r.Site.ReviewCount),
		"site_year_founded": strconv.Itoa(r.Site.YearFounded),
		"social_facebook":   r.Site.Social.Facebook, "social_instagram": r.Site.Social.Instagram,
		"social_youtube": r.Site.Social.YouTube, "social_google": r.Site.Social.Google,
		"booking_windows": strings.Join(r.Windows, "|"), "booking_capacity": strconv.Itoa(r.Capacity),
		"booking_days": strconv.Itoa(r.Days), "booking_lead_days": strconv.Itoa(r.LeadDays),
	}
}

// GET /api/admin/settings
func (s *Server) adminGetSettings(w http.ResponseWriter, r *http.Request) {
	vals := s.currentValues()
	fields := make([]map[string]any, 0, len(settingKeys))
	for _, k := range settingKeys {
		fields = append(fields, map[string]any{"key": k.Key, "label": k.Label, "kind": k.Kind, "help": k.Help, "value": vals[k.Key]})
	}
	writeJSON(w, http.StatusOK, map[string]any{"fields": fields})
}

// PUT /api/admin/settings  { "site_phone": "...", ... }  (only known keys; empty = revert to env default)
func (s *Server) adminPutSettings(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	var in map[string]string
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	errs := map[string]string{}
	for _, k := range settingKeys {
		v, ok := in[k.Key]
		if !ok {
			continue
		}
		v = strings.TrimSpace(v)
		if v != "" && k.Kind == "number" {
			if _, err := strconv.ParseFloat(v, 64); err != nil {
				errs[k.Key] = "must be a number"
			}
		}
		if k.Key == "booking_windows" && v != "" {
			for _, win := range strings.Split(v, "|") {
				parts := strings.Split(win, "-")
				if len(parts) != 2 {
					errs[k.Key] = "each window must look like 08:00-10:00"
					break
				}
				for _, p := range parts {
					if _, err := time.Parse("15:04", strings.TrimSpace(p)); err != nil {
						errs[k.Key] = "each window must look like 08:00-10:00"
					}
				}
			}
		}
	}
	if len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "validation failed", "fields": errs})
		return
	}
	tx, err := s.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer func() { _ = tx.Rollback() }()
	for _, k := range settingKeys {
		v, ok := in[k.Key]
		if !ok {
			continue
		}
		v = strings.TrimSpace(v)
		if v == "" {
			_, err = tx.Exec(`DELETE FROM settings WHERE key = ?`, k.Key)
		} else {
			_, err = tx.Exec(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
				ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, k.Key, v)
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "save failed")
			return
		}
	}
	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "save failed")
		return
	}
	s.invalidateRuntime()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ---- Blocked dates ----------------------------------------------------------------

func (s *Server) blockedDates() map[string]string {
	out := map[string]string{}
	rows, err := s.DB.Query(`SELECT date, reason FROM blocked_dates`)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var d, reason string
		if err := rows.Scan(&d, &reason); err == nil {
			out[d] = reason
		}
	}
	return out
}

// GET /api/admin/blocked-dates
func (s *Server) adminListBlocked(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT date, reason FROM blocked_dates WHERE date >= date('now', '-1 day') ORDER BY date`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	type bd struct {
		Date   string `json:"date"`
		Reason string `json:"reason"`
	}
	out := []bd{}
	for rows.Next() {
		var b bd
		if err := rows.Scan(&b.Date, &b.Reason); err == nil {
			out = append(out, b)
		}
	}
	writeJSON(w, http.StatusOK, out)
}

// POST /api/admin/blocked-dates { "date": "2026-12-25", "reason": "Holiday" }
func (s *Server) adminAddBlocked(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Date   string `json:"date"`
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if _, err := time.Parse("2006-01-02", in.Date); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "date must be YYYY-MM-DD")
		return
	}
	if len(in.Reason) > 120 {
		in.Reason = in.Reason[:120]
	}
	if _, err := s.DB.Exec(`INSERT INTO blocked_dates (date, reason) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET reason = excluded.reason`, in.Date, in.Reason); err != nil {
		writeError(w, http.StatusInternalServerError, "save failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// DELETE /api/admin/blocked-dates/{date}
func (s *Server) adminRemoveBlocked(w http.ResponseWriter, r *http.Request) {
	date := chi.URLParam(r, "date")
	if _, err := time.Parse("2006-01-02", date); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "date must be YYYY-MM-DD")
		return
	}
	if _, err := s.DB.Exec(`DELETE FROM blocked_dates WHERE date = ?`, date); err != nil {
		writeError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
