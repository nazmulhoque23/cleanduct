package handlers

import (
	"net/http"
	"time"

	"ductcleaning/internal/models"
)

// GET /api/admin/dashboard — the numbers an owner wants at a glance.
func (s *Server) adminDashboard(w http.ResponseWriter, r *http.Request) {
	now := time.Now().In(chicago)
	today := now.Format("2006-01-02")
	weekEnd := now.AddDate(0, 0, 7).Format("2006-01-02")
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, chicago).Format("2006-01-02")

	count := func(q string, args ...any) int {
		var n int
		_ = s.DB.QueryRow(q, args...).Scan(&n)
		return n
	}
	sum := func(q string, args ...any) int64 {
		var n int64
		_ = s.DB.QueryRow(q, args...).Scan(&n)
		return n
	}

	stats := map[string]any{
		"newLeads":           count(`SELECT COUNT(*) FROM leads WHERE status = 'new'`),
		"leadsThisMonth":     count(`SELECT COUNT(*) FROM leads WHERE date(created_at) >= ?`, monthStart),
		"pendingBookings":    count(`SELECT COUNT(*) FROM bookings WHERE status = 'requested'`),
		"bookingsToday":      count(`SELECT COUNT(*) FROM bookings WHERE slot_date = ? AND status IN ('requested','confirmed')`, today),
		"bookingsThisWeek":   count(`SELECT COUNT(*) FROM bookings WHERE slot_date BETWEEN ? AND ? AND status IN ('requested','confirmed')`, today, weekEnd),
		"completedThisMonth": count(`SELECT COUNT(*) FROM bookings WHERE status = 'completed' AND slot_date >= ?`, monthStart),
		"quotedThisMonth":    sum(`SELECT COALESCE(SUM(quoted_price),0) FROM bookings WHERE status IN ('confirmed','completed') AND slot_date >= ?`, monthStart),
		"chatsToday":         count(`SELECT COUNT(DISTINCT session_id) FROM chat_messages WHERE date(created_at) = date('now')`),
		"blockedUpcoming":    count(`SELECT COUNT(*) FROM blocked_dates WHERE date >= ?`, today),
	}

	// Next jobs (today onward), pending first so decisions are one click away.
	rows, err := s.DB.Query(`SELECT `+bookingCols+` FROM bookings WHERE slot_date >= ? AND status IN ('requested','confirmed')
		ORDER BY CASE status WHEN 'requested' THEN 0 ELSE 1 END, slot_date, slot_window LIMIT 12`, today)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	upcoming := []models.Booking{}
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		upcoming = append(upcoming, b)
	}

	// Latest leads still waiting for a call back.
	lrows, err := s.DB.Query(`SELECT id, full_name, phone, service, zip_code, created_at FROM leads WHERE status = 'new' ORDER BY id DESC LIMIT 8`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer lrows.Close()
	type leadRow struct {
		ID        int64  `json:"id"`
		FullName  string `json:"fullName"`
		Phone     string `json:"phone"`
		Service   string `json:"service"`
		ZipCode   string `json:"zipCode"`
		CreatedAt string `json:"createdAt"`
	}
	leads := []leadRow{}
	for lrows.Next() {
		var l leadRow
		if err := lrows.Scan(&l.ID, &l.FullName, &l.Phone, &l.Service, &l.ZipCode, &l.CreatedAt); err == nil {
			leads = append(leads, l)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"today":    today,
		"stats":    stats,
		"upcoming": upcoming,
		"newLeads": leads,
	})
}
