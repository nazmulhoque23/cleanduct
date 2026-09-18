package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"ductcleaning/internal/config"
	"ductcleaning/internal/db"
	"ductcleaning/internal/models"
)

// ---- validateLead -----------------------------------------------------------

func TestValidateLead(t *testing.T) {
	cases := []struct {
		name    string
		in      models.LeadInput
		wantErr []string // field keys expected in the error map
	}{
		{"valid", models.LeadInput{FullName: "Jane Doe", Email: "jane@example.com", Phone: "(312) 555-0100", ZipCode: "60193"}, nil},
		{"missing name", models.LeadInput{FullName: "J", Email: "jane@example.com", Phone: "3125550100"}, []string{"fullName"}},
		{"bad email", models.LeadInput{FullName: "Jane Doe", Email: "not-an-email", Phone: "3125550100"}, []string{"email"}},
		{"short phone", models.LeadInput{FullName: "Jane Doe", Email: "jane@example.com", Phone: "555"}, []string{"phone"}},
		{"bad zip", models.LeadInput{FullName: "Jane Doe", Email: "jane@example.com", Phone: "3125550100", ZipCode: "1234"}, []string{"zipCode"}},
		{"text without consent", models.LeadInput{FullName: "Jane Doe", Email: "jane@example.com", Phone: "3125550100", ContactPref: "text"}, []string{"smsConsent"}},
		{"text with consent", models.LeadInput{FullName: "Jane Doe", Email: "jane@example.com", Phone: "3125550100", ContactPref: "text", SmsConsent: true}, nil},
		{"unknown pref", models.LeadInput{FullName: "Jane Doe", Email: "jane@example.com", Phone: "3125550100", ContactPref: "carrier pigeon"}, []string{"contactPref"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			errs := validateLead(&tc.in)
			if len(tc.wantErr) == 0 && len(errs) != 0 {
				t.Fatalf("expected no errors, got %v", errs)
			}
			for _, k := range tc.wantErr {
				if _, ok := errs[k]; !ok {
					t.Errorf("expected error for %q, got %v", k, errs)
				}
			}
		})
	}
}

func TestValidateLeadDefaultsContactPref(t *testing.T) {
	in := models.LeadInput{FullName: "Jane Doe", Email: "jane@example.com", Phone: "3125550100"}
	if errs := validateLead(&in); len(errs) != 0 {
		t.Fatalf("unexpected errors: %v", errs)
	}
	if in.ContactPref != "phone" {
		t.Errorf("expected default contactPref=phone, got %q", in.ContactPref)
	}
}

// ---- rate limiter -----------------------------------------------------------

func TestRateLimiter(t *testing.T) {
	rl := newRateLimiter(3, time.Minute)
	for i := 0; i < 3; i++ {
		if !rl.allow("1.2.3.4") {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	if rl.allow("1.2.3.4") {
		t.Fatal("4th request should be blocked")
	}
	if !rl.allow("5.6.7.8") {
		t.Fatal("different IP should be allowed")
	}
}

// ---- bookings: availability + create, against a temp SQLite DB --------------

type nopNotifier struct{}

func (nopNotifier) NewLead(models.Lead) error                          { return nil }
func (nopNotifier) NewBooking(models.Booking) error                    { return nil }
func (nopNotifier) BookingUpdate(models.Booking, string, string) error { return nil }

func newTestServer(t *testing.T) *Server {
	t.Helper()
	conn, err := db.Open(t.TempDir() + "/test.db")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Migrate(conn); err != nil {
		t.Fatal(err)
	}
	cfg := config.Load()
	cfg.BookingCapacity = 1
	cfg.BookingDays = 3
	cfg.BookingLeadDays = 1
	cfg.BookingWindows = []string{"08:00-10:00", "10:00-12:00"}
	cfg.AdminToken = "test-token"
	return New(conn, cfg, nopNotifier{})
}

func TestAvailabilitySkipsSundaysAndRespectsLeadTime(t *testing.T) {
	s := newTestServer(t)
	// A Saturday: lead time 1 day → first bookable is Monday (Sunday closed).
	sat := time.Date(2026, time.September, 19, 10, 0, 0, 0, chicago)
	days, err := s.availability(sat)
	if err != nil {
		t.Fatal(err)
	}
	if len(days) != 3 {
		t.Fatalf("expected 3 days, got %d", len(days))
	}
	if days[0].Date != "2026-09-21" {
		t.Errorf("expected first bookable day 2026-09-21 (Mon), got %s", days[0].Date)
	}
	for _, d := range days {
		if dt, _ := time.Parse("2006-01-02", d.Date); dt.Weekday() == time.Sunday {
			t.Errorf("Sunday %s should not be bookable", d.Date)
		}
		if d.Windows["08:00-10:00"] != 1 {
			t.Errorf("expected capacity 1 for %s, got %d", d.Date, d.Windows["08:00-10:00"])
		}
	}
}

func TestCreateBookingConsumesCapacity(t *testing.T) {
	s := newTestServer(t)
	days, _ := s.availability(time.Now().In(chicago))
	slot := days[0]

	post := func(body map[string]any) *httptest.ResponseRecorder {
		b, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, "/api/bookings", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "9.9.9.9:1234"
		rec := httptest.NewRecorder()
		s.Router().ServeHTTP(rec, req)
		return rec
	}
	valid := map[string]any{
		"fullName": "Jane Doe", "email": "jane@example.com", "phone": "3125550100", "address": "7 N Roselle Rd",
		"zipCode": "60193", "service": "Air Duct Cleaning", "slotDate": slot.Date, "slotWindow": "08:00-10:00",
	}
	if rec := post(valid); rec.Code != http.StatusCreated {
		t.Fatalf("first booking: expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	// Capacity is 1 → second booking in the same window must be rejected.
	if rec := post(valid); rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("second booking: expected 422, got %d: %s", rec.Code, rec.Body.String())
	}
	// Other window still free.
	valid["slotWindow"] = "10:00-12:00"
	if rec := post(valid); rec.Code != http.StatusCreated {
		t.Fatalf("other window: expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	// Honeypot filled → pretend success, store nothing.
	valid["website"] = "spam"
	if rec := post(valid); rec.Code != http.StatusCreated {
		t.Fatalf("honeypot: expected 201, got %d", rec.Code)
	}
	var n int
	if err := s.DB.QueryRow(`SELECT COUNT(*) FROM bookings`).Scan(&n); err != nil || n != 2 {
		t.Fatalf("expected 2 stored bookings, got %d (err %v)", n, err)
	}
}

func TestAdminRequiresToken(t *testing.T) {
	s := newTestServer(t)
	req := httptest.NewRequest(http.MethodGet, "/api/admin/leads", nil)
	rec := httptest.NewRecorder()
	s.Router().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without token, got %d", rec.Code)
	}
	req.Header.Set("Authorization", "Bearer test-token")
	rec = httptest.NewRecorder()
	s.Router().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 with token, got %d", rec.Code)
	}
}

func TestAdminContentCRUD(t *testing.T) {
	s := newTestServer(t)
	do := func(method, path string, body any) *httptest.ResponseRecorder {
		var rdr *bytes.Reader
		if body != nil {
			b, _ := json.Marshal(body)
			rdr = bytes.NewReader(b)
		} else {
			rdr = bytes.NewReader(nil)
		}
		req := httptest.NewRequest(method, path, rdr)
		req.Header.Set("Authorization", "Bearer test-token")
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		s.Router().ServeHTTP(rec, req)
		return rec
	}
	// create
	rec := do(http.MethodPost, "/api/admin/content/faqs", map[string]any{"question": "Q?", "answer": "A.", "sortOrder": 1})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	var created struct{ ID int64 }
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	// missing required
	if rec := do(http.MethodPost, "/api/admin/content/faqs", map[string]any{"question": "Q?"}); rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for missing answer, got %d", rec.Code)
	}
	// update
	if rec := do(http.MethodPatch, "/api/admin/content/faqs/1", map[string]any{"answer": "B."}); rec.Code != http.StatusOK {
		t.Fatalf("update: %d %s", rec.Code, rec.Body.String())
	}
	// list reflects update
	rec = do(http.MethodGet, "/api/admin/content/faqs", nil)
	var rows []map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &rows)
	if len(rows) != 1 || rows[0]["answer"] != "B." {
		t.Fatalf("list: unexpected %v", rows)
	}
	// delete
	if rec := do(http.MethodDelete, "/api/admin/content/faqs/1", nil); rec.Code != http.StatusOK {
		t.Fatalf("delete: %d", rec.Code)
	}
	// unknown resource
	if rec := do(http.MethodGet, "/api/admin/content/users", nil); rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown resource, got %d", rec.Code)
	}
}

func TestSitemapAndRobots(t *testing.T) {
	s := newTestServer(t)
	for _, p := range []string{"/sitemap.xml", "/robots.txt"} {
		req := httptest.NewRequest(http.MethodGet, p, nil)
		rec := httptest.NewRecorder()
		s.Router().ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("%s: expected 200, got %d", p, rec.Code)
		}
		if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
			t.Errorf("%s: security headers missing", p)
		}
	}
}

func TestSplitAddress(t *testing.T) {
	st, city, region, zip := splitAddress("7 N Roselle Rd, Schaumburg, IL 60193")
	if st != "7 N Roselle Rd" || city != "Schaumburg" || region != "IL" || zip != "60193" {
		t.Errorf("got %q %q %q %q", st, city, region, zip)
	}
}

// ---- owner operations: decisions, settings, blocked dates -------------------

func adminDo(t *testing.T, s *Server, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var rdr *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rdr = bytes.NewReader(b)
	} else {
		rdr = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, rdr)
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	s.Router().ServeHTTP(rec, req)
	return rec
}

func seedBooking(t *testing.T, s *Server, date, window string) int64 {
	t.Helper()
	res, err := s.DB.Exec(`INSERT INTO bookings (full_name, email, phone, address, zip_code, service, slot_date, slot_window, status)
		VALUES ('Jane Doe','jane@example.com','3125550100','7 N Roselle Rd','60193','Air Duct Cleaning',?,?,'requested')`, date, window)
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	return id
}

func TestBookingAcceptRejectReschedule(t *testing.T) {
	s := newTestServer(t)
	days, _ := s.availability(time.Now().In(chicago))
	id := seedBooking(t, s, days[0].Date, "08:00-10:00")

	// accept with a quote
	rec := adminDo(t, s, http.MethodPost, "/api/admin/bookings/"+itoa(id)+"/accept", map[string]any{"quotedPrice": 349, "note": "See you then"})
	if rec.Code != http.StatusOK {
		t.Fatalf("accept: %d %s", rec.Code, rec.Body.String())
	}
	var b models.Booking
	_ = json.Unmarshal(rec.Body.Bytes(), &b)
	if b.Status != "confirmed" || b.QuotedPrice == nil || *b.QuotedPrice != 349 || b.AdminNote != "See you then" {
		t.Fatalf("accept: unexpected %+v", b)
	}
	// accept with empty body keeps the quote
	rec = adminDo(t, s, http.MethodPost, "/api/admin/bookings/"+itoa(id)+"/accept", nil)
	_ = json.Unmarshal(rec.Body.Bytes(), &b)
	if rec.Code != http.StatusOK || b.QuotedPrice == nil || *b.QuotedPrice != 349 {
		t.Fatalf("accept (empty body): %d %+v", rec.Code, b)
	}

	// reschedule into a full window → 409
	other := seedBooking(t, s, days[1].Date, "10:00-12:00")
	rec = adminDo(t, s, http.MethodPost, "/api/admin/bookings/"+itoa(id)+"/reschedule", map[string]any{"slotDate": days[1].Date, "slotWindow": "10:00-12:00"})
	if rec.Code != http.StatusConflict {
		t.Fatalf("reschedule into full window: expected 409, got %d", rec.Code)
	}
	// reschedule into a free window → ok
	rec = adminDo(t, s, http.MethodPost, "/api/admin/bookings/"+itoa(id)+"/reschedule", map[string]any{"slotDate": days[1].Date, "slotWindow": "08:00-10:00"})
	_ = json.Unmarshal(rec.Body.Bytes(), &b)
	if rec.Code != http.StatusOK || b.SlotDate != days[1].Date || b.SlotWindow != "08:00-10:00" || b.Status != "confirmed" {
		t.Fatalf("reschedule: %d %+v", rec.Code, b)
	}
	// unknown window → 422
	if rec := adminDo(t, s, http.MethodPost, "/api/admin/bookings/"+itoa(id)+"/reschedule", map[string]any{"slotDate": days[1].Date, "slotWindow": "23:00-24:00"}); rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("bad window: expected 422, got %d", rec.Code)
	}

	// reject
	rec = adminDo(t, s, http.MethodPost, "/api/admin/bookings/"+itoa(other)+"/reject", map[string]any{"reason": "Outside service area"})
	_ = json.Unmarshal(rec.Body.Bytes(), &b)
	if rec.Code != http.StatusOK || b.Status != "cancelled" || b.DeclineReason != "Outside service area" {
		t.Fatalf("reject: %d %+v", rec.Code, b)
	}
	// rejected booking frees its window
	av, _ := s.availability(time.Now().In(chicago))
	if av[1].Windows["10:00-12:00"] != 1 {
		t.Fatalf("expected freed capacity after reject, got %d", av[1].Windows["10:00-12:00"])
	}
	// price out of range
	if rec := adminDo(t, s, http.MethodPatch, "/api/admin/bookings/"+itoa(id)+"/details", map[string]any{"quotedPrice": -5}); rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("bad price: expected 422, got %d", rec.Code)
	}
	// missing booking
	if rec := adminDo(t, s, http.MethodPost, "/api/admin/bookings/9999/accept", nil); rec.Code != http.StatusNotFound {
		t.Fatalf("missing: expected 404, got %d", rec.Code)
	}
}

func TestSettingsOverrideAndBlockedDates(t *testing.T) {
	s := newTestServer(t)
	s.invalidateRuntime()
	defer s.invalidateRuntime()

	// capacity 1 → 3 via settings; phone override shows up in /api/site
	rec := adminDo(t, s, http.MethodPut, "/api/admin/settings", map[string]string{"booking_capacity": "3", "site_phone": "(847) 555-0199"})
	if rec.Code != http.StatusOK {
		t.Fatalf("put settings: %d %s", rec.Code, rec.Body.String())
	}
	if rt := s.rt(); rt.Capacity != 3 || rt.Site.Phone != "(847) 555-0199" || rt.Site.PhoneHref != "tel:+18475550199" {
		t.Fatalf("settings not applied: %+v", rt)
	}
	// invalid window format → 422
	if rec := adminDo(t, s, http.MethodPut, "/api/admin/settings", map[string]string{"booking_windows": "morning|afternoon"}); rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("bad windows: expected 422, got %d", rec.Code)
	}
	// empty value reverts to env default
	adminDo(t, s, http.MethodPut, "/api/admin/settings", map[string]string{"booking_capacity": ""})
	if rt := s.rt(); rt.Capacity != 1 {
		t.Fatalf("expected revert to 1, got %d", rt.Capacity)
	}
	// GET returns fields with effective values
	rec = adminDo(t, s, http.MethodGet, "/api/admin/settings", nil)
	var got struct {
		Fields []struct{ Key, Value string }
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &got)
	found := false
	for _, f := range got.Fields {
		if f.Key == "site_phone" && f.Value == "(847) 555-0199" {
			found = true
		}
	}
	if !found {
		t.Fatalf("settings GET missing override: %s", rec.Body.String())
	}

	// blocked date disappears from availability
	days, _ := s.availability(time.Now().In(chicago))
	blocked := days[0].Date
	if rec := adminDo(t, s, http.MethodPost, "/api/admin/blocked-dates", map[string]string{"date": blocked, "reason": "Holiday"}); rec.Code != http.StatusOK {
		t.Fatalf("block: %d %s", rec.Code, rec.Body.String())
	}
	days, _ = s.availability(time.Now().In(chicago))
	for _, d := range days {
		if d.Date == blocked {
			t.Fatalf("blocked date %s still bookable", blocked)
		}
	}
	if len(days) != 3 {
		t.Fatalf("expected 3 bookable days after blocking one, got %d", len(days))
	}
	if rec := adminDo(t, s, http.MethodDelete, "/api/admin/blocked-dates/"+blocked, nil); rec.Code != http.StatusOK {
		t.Fatalf("unblock: %d", rec.Code)
	}
	days, _ = s.availability(time.Now().In(chicago))
	if days[0].Date != blocked {
		t.Fatalf("expected %s bookable again, got %s", blocked, days[0].Date)
	}
	if rec := adminDo(t, s, http.MethodPost, "/api/admin/blocked-dates", map[string]string{"date": "tomorrow"}); rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("bad date: expected 422, got %d", rec.Code)
	}
}

func TestDashboard(t *testing.T) {
	s := newTestServer(t)
	days, _ := s.availability(time.Now().In(chicago))
	seedBooking(t, s, days[0].Date, "08:00-10:00")
	rec := adminDo(t, s, http.MethodGet, "/api/admin/dashboard", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("dashboard: %d %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Stats    map[string]any
		Upcoming []models.Booking
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Stats["pendingBookings"] != float64(1) || len(out.Upcoming) != 1 {
		t.Fatalf("dashboard: unexpected %s", rec.Body.String())
	}
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }
