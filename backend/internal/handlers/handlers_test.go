package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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

func (nopNotifier) NewLead(models.Lead) error       { return nil }
func (nopNotifier) NewBooking(models.Booking) error { return nil }

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
