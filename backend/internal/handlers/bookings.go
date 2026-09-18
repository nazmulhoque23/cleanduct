package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"ductcleaning/internal/models"
)

// chicago is the business's local time zone; slots are interpreted in it.
var chicago = func() *time.Location {
	if loc, err := time.LoadLocation("America/Chicago"); err == nil {
		return loc
	}
	return time.UTC
}()

// bookableDays returns the dates customers may currently book, in order.
func (s *Server) bookableDays(now time.Time) []time.Time {
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, chicago).AddDate(0, 0, s.Cfg.BookingLeadDays)
	var days []time.Time
	for d := start; len(days) < s.Cfg.BookingDays; d = d.AddDate(0, 0, 1) {
		closed := false
		for _, wd := range s.Cfg.BookingClosed {
			if d.Weekday() == wd {
				closed = true
				break
			}
		}
		if !closed {
			days = append(days, d)
		}
	}
	return days
}

// availability computes remaining capacity per window for each bookable day.
func (s *Server) availability(now time.Time) ([]models.AvailabilityDay, error) {
	days := s.bookableDays(now)
	if len(days) == 0 {
		return []models.AvailabilityDay{}, nil
	}
	first, last := days[0].Format("2006-01-02"), days[len(days)-1].Format("2006-01-02")

	// Count active bookings per (date, window) in one query.
	rows, err := s.DB.Query(`SELECT slot_date, slot_window, COUNT(*) FROM bookings
		WHERE slot_date BETWEEN ? AND ? AND status != 'cancelled' GROUP BY slot_date, slot_window`, first, last)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	used := map[string]int{}
	for rows.Next() {
		var d, w string
		var n int
		if err := rows.Scan(&d, &w, &n); err != nil {
			return nil, err
		}
		used[d+"|"+w] = n
	}

	out := make([]models.AvailabilityDay, 0, len(days))
	for _, d := range days {
		ds := d.Format("2006-01-02")
		day := models.AvailabilityDay{Date: ds, Label: d.Format("Mon, Jan 2"), Windows: map[string]int{}}
		for _, w := range s.Cfg.BookingWindows {
			left := s.Cfg.BookingCapacity - used[ds+"|"+w]
			if left < 0 {
				left = 0
			}
			day.Windows[w] = left
		}
		out = append(out, day)
	}
	return out, nil
}

// GET /api/availability
func (s *Server) getAvailability(w http.ResponseWriter, r *http.Request) {
	days, err := s.availability(time.Now().In(chicago))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, map[string]any{"windows": s.Cfg.BookingWindows, "days": days})
}

// POST /api/bookings
func (s *Server) createBooking(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !s.limiter.allow(ip) {
		writeError(w, http.StatusTooManyRequests, "too many requests, please call us instead")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 32<<10)
	var in models.BookingInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if strings.TrimSpace(in.Website) != "" { // honeypot
		writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
		return
	}
	errs := validateBooking(&in, s.Cfg.BookingWindows)
	if len(errs) == 0 {
		// Slot must be currently bookable and have capacity.
		days, err := s.availability(time.Now().In(chicago))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "query failed")
			return
		}
		ok := false
		for _, d := range days {
			if d.Date == in.SlotDate {
				ok = d.Windows[in.SlotWindow] > 0
				break
			}
		}
		if !ok {
			errs["slotWindow"] = "That time is no longer available — please pick another."
		}
	}
	if len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "validation failed", "fields": errs})
		return
	}

	res, err := s.DB.Exec(`INSERT INTO bookings (full_name,email,phone,address,zip_code,service,slot_date,slot_window,notes,sms_consent,ip)
		VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		in.FullName, in.Email, in.Phone, in.Address, in.ZipCode, in.Service, in.SlotDate, in.SlotWindow, in.Notes, boolInt(in.SmsConsent), ip)
	if err != nil {
		log.Printf("insert booking: %v", err)
		writeError(w, http.StatusInternalServerError, "could not save booking")
		return
	}
	id, _ := res.LastInsertId()
	b := models.Booking{
		ID: id, FullName: in.FullName, Email: in.Email, Phone: in.Phone, Address: in.Address, ZipCode: in.ZipCode,
		Service: in.Service, SlotDate: in.SlotDate, SlotWindow: in.SlotWindow, Notes: in.Notes, SmsConsent: in.SmsConsent,
		Status: "requested", CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	go func() {
		if err := s.Notifier.NewBooking(b); err != nil {
			log.Printf("notify booking #%d: %v", b.ID, err)
		}
	}()
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true, "id": id})
}

func validateBooking(in *models.BookingInput, windows []string) map[string]string {
	errs := map[string]string{}
	in.FullName = strings.TrimSpace(in.FullName)
	in.Email = strings.TrimSpace(strings.ToLower(in.Email))
	in.Phone = strings.TrimSpace(in.Phone)
	in.Address = strings.TrimSpace(in.Address)
	in.ZipCode = strings.TrimSpace(in.ZipCode)
	in.Service = strings.TrimSpace(in.Service)
	in.Notes = strings.TrimSpace(in.Notes)

	if len(in.FullName) < 2 || len(in.FullName) > 100 {
		errs["fullName"] = "Please enter your name."
	}
	if _, err := mail.ParseAddress(in.Email); err != nil || len(in.Email) > 200 {
		errs["email"] = "Please enter a valid email address."
	}
	if d := digits(in.Phone); len(d) < 10 || len(d) > 15 {
		errs["phone"] = "Please enter a valid phone number."
	}
	if len(in.Address) < 5 || len(in.Address) > 200 {
		errs["address"] = "Please enter the service address."
	}
	if len(digits(in.ZipCode)) != 5 {
		errs["zipCode"] = "Please enter a 5-digit ZIP code."
	}
	if in.Service == "" || len(in.Service) > 100 {
		errs["service"] = "Please choose a service."
	}
	if _, err := time.Parse("2006-01-02", in.SlotDate); err != nil {
		errs["slotDate"] = "Please pick a date."
	}
	valid := false
	for _, w := range windows {
		if w == in.SlotWindow {
			valid = true
			break
		}
	}
	if !valid {
		errs["slotWindow"] = "Please pick an arrival window."
	}
	if len(in.Notes) > 1000 {
		errs["notes"] = "Notes are too long (1000 characters max)."
	}
	return errs
}

// ---- Admin -------------------------------------------------------------------

const bookingCols = `id, full_name, email, phone, address, zip_code, service, slot_date, slot_window, notes, sms_consent, status, created_at`

func scanBooking(row interface{ Scan(...any) error }) (models.Booking, error) {
	var b models.Booking
	var consent int
	err := row.Scan(&b.ID, &b.FullName, &b.Email, &b.Phone, &b.Address, &b.ZipCode, &b.Service, &b.SlotDate, &b.SlotWindow, &b.Notes, &consent, &b.Status, &b.CreatedAt)
	b.SmsConsent = consent == 1
	return b, err
}

func (s *Server) adminListBookings(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT ` + bookingCols + ` FROM bookings ORDER BY slot_date DESC, slot_window DESC LIMIT 500`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	out := []models.Booking{}
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		out = append(out, b)
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) adminUpdateBooking(w http.ResponseWriter, r *http.Request) {
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
	case "requested", "confirmed", "completed", "cancelled":
	default:
		writeError(w, http.StatusUnprocessableEntity, "status must be requested|confirmed|completed|cancelled")
		return
	}
	res, err := s.DB.Exec(`UPDATE bookings SET status = ? WHERE id = ?`, body.Status, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
