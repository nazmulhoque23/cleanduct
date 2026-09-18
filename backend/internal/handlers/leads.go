package handlers

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"ductcleaning/internal/models"
)

// ---- Simple in-memory rate limiter (per IP) ------------------------------
// Good enough for a single-instance small-business site. Swap for Redis or
// a reverse-proxy limit if you ever run multiple replicas.

type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{hits: map[string][]time.Time{}, limit: limit, window: window}
	go func() { // periodic cleanup
		for range time.Tick(window) {
			rl.mu.Lock()
			cutoff := time.Now().Add(-window)
			for k, ts := range rl.hits {
				kept := ts[:0]
				for _, t := range ts {
					if t.After(cutoff) {
						kept = append(kept, t)
					}
				}
				if len(kept) == 0 {
					delete(rl.hits, k)
				} else {
					rl.hits[k] = kept
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-rl.window)
	ts := rl.hits[key]
	kept := ts[:0]
	for _, t := range ts {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= rl.limit {
		rl.hits[key] = kept
		return false
	}
	rl.hits[key] = append(kept, now)
	return true
}

// ---- POST /api/leads -------------------------------------------------------

func (s *Server) createLead(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !s.limiter.allow(ip) {
		writeError(w, http.StatusTooManyRequests, "too many requests, please call us instead")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 32<<10) // 32 KB is plenty
	var in models.LeadInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Honeypot: silently accept so bots think it worked.
	if strings.TrimSpace(in.Website) != "" {
		writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
		return
	}

	if errs := validateLead(&in); len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "validation failed", "fields": errs})
		return
	}

	res, err := s.DB.Exec(`INSERT INTO leads (full_name,email,phone,zip_code,service,contact_pref,message,source_page,ip,sms_consent)
		VALUES (?,?,?,?,?,?,?,?,?,?)`,
		in.FullName, in.Email, in.Phone, in.ZipCode, in.Service, in.ContactPref, in.Message, in.SourcePage, ip, boolInt(in.SmsConsent))
	if err != nil {
		log.Printf("insert lead: %v", err)
		writeError(w, http.StatusInternalServerError, "could not save request")
		return
	}
	id, _ := res.LastInsertId()

	lead := models.Lead{
		ID: id, FullName: in.FullName, Email: in.Email, Phone: in.Phone, ZipCode: in.ZipCode,
		Service: in.Service, ContactPref: in.ContactPref, Message: in.Message, SourcePage: in.SourcePage,
		SmsConsent: in.SmsConsent, Status: "new", CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	// Notify asynchronously so a slow SMTP server never delays the user.
	go func() {
		if err := s.Notifier.NewLead(lead); err != nil {
			log.Printf("notify lead #%d: %v", lead.ID, err)
		}
	}()

	writeJSON(w, http.StatusCreated, map[string]any{"ok": true, "id": id})
}

func validateLead(in *models.LeadInput) map[string]string {
	errs := map[string]string{}
	in.FullName = strings.TrimSpace(in.FullName)
	in.Email = strings.TrimSpace(strings.ToLower(in.Email))
	in.Phone = strings.TrimSpace(in.Phone)
	in.ZipCode = strings.TrimSpace(in.ZipCode)
	in.Service = strings.TrimSpace(in.Service)
	in.Message = strings.TrimSpace(in.Message)
	in.SourcePage = strings.TrimSpace(in.SourcePage)

	if len(in.FullName) < 2 || len(in.FullName) > 100 {
		errs["fullName"] = "Please enter your name."
	}
	if _, err := mail.ParseAddress(in.Email); err != nil || len(in.Email) > 200 {
		errs["email"] = "Please enter a valid email address."
	}
	if d := digits(in.Phone); len(d) < 10 || len(d) > 15 {
		errs["phone"] = "Please enter a valid phone number."
	}
	if in.ZipCode != "" && (len(digits(in.ZipCode)) != 5) {
		errs["zipCode"] = "Please enter a 5-digit ZIP code."
	}
	if len(in.Message) > 2000 {
		errs["message"] = "Message is too long (2000 characters max)."
	}
	switch in.ContactPref {
	case "phone", "email":
	case "text":
		if !in.SmsConsent {
			errs["smsConsent"] = "Please agree to receive text messages, or choose phone/email."
		}
	case "":
		in.ContactPref = "phone"
	default:
		errs["contactPref"] = "Choose phone, text or email."
	}
	if len(in.Service) > 100 {
		in.Service = in.Service[:100]
	}
	if len(in.SourcePage) > 200 {
		in.SourcePage = in.SourcePage[:200]
	}
	return errs
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func digits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// ---- Admin: GET /api/admin/leads, PATCH /api/admin/leads/{id} -------------

func (s *Server) adminListLeads(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT id, full_name, email, phone, zip_code, service, contact_pref, message, source_page, status, created_at, sms_consent
		FROM leads ORDER BY created_at DESC LIMIT 500`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	out := []models.Lead{}
	for rows.Next() {
		var l models.Lead
		var consent int
		if err := rows.Scan(&l.ID, &l.FullName, &l.Email, &l.Phone, &l.ZipCode, &l.Service, &l.ContactPref, &l.Message, &l.SourcePage, &l.Status, &l.CreatedAt, &consent); err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		l.SmsConsent = consent == 1
		out = append(out, l)
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) adminUpdateLead(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	switch body.Status {
	case "new", "contacted", "booked", "closed":
	default:
		writeError(w, http.StatusUnprocessableEntity, "status must be new|contacted|booked|closed")
		return
	}
	res, err := s.DB.Exec(`UPDATE leads SET status = ? WHERE id = ?`, body.Status, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "lead not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
