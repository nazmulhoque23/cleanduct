package handlers

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"ductcleaning/internal/models"
)

// ---- Services --------------------------------------------------------------

const serviceCols = `id, slug, name, short_desc, long_desc, icon, category, starting_at, featured`

func scanService(row interface{ Scan(...any) error }) (models.Service, error) {
	var s models.Service
	var price sql.NullInt64
	var featured int
	err := row.Scan(&s.ID, &s.Slug, &s.Name, &s.ShortDesc, &s.LongDesc, &s.Icon, &s.Category, &price, &featured)
	if price.Valid {
		v := price.Int64
		s.StartingAt = &v
	}
	s.Featured = featured == 1
	return s, err
}

func (s *Server) listServices(w http.ResponseWriter, r *http.Request) {
	q := `SELECT ` + serviceCols + ` FROM services`
	var args []any
	if cat := r.URL.Query().Get("category"); cat != "" {
		q += ` WHERE category = ?`
		args = append(args, cat)
	}
	if r.URL.Query().Get("featured") == "1" {
		if len(args) == 0 {
			q += ` WHERE featured = 1`
		} else {
			q += ` AND featured = 1`
		}
	}
	q += ` ORDER BY sort_order, name`

	rows, err := s.DB.Query(q, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	out := []models.Service{}
	for rows.Next() {
		svc, err := scanService(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		out = append(out, svc)
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) getService(w http.ResponseWriter, r *http.Request) {
	row := s.DB.QueryRow(`SELECT `+serviceCols+` FROM services WHERE slug = ?`, chi.URLParam(r, "slug"))
	svc, err := scanService(row)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "service not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	writeJSON(w, http.StatusOK, svc)
}

// ---- Service areas ---------------------------------------------------------

func (s *Server) listServiceAreas(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT id, slug, city, state, zip_codes, blurb, featured FROM service_areas ORDER BY featured DESC, city`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	out := []models.ServiceArea{}
	for rows.Next() {
		var a models.ServiceArea
		var f int
		if err := rows.Scan(&a.ID, &a.Slug, &a.City, &a.State, &a.ZipCodes, &a.Blurb, &f); err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		a.Featured = f == 1
		out = append(out, a)
	}
	w.Header().Set("Cache-Control", "public, max-age=300")
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) getServiceArea(w http.ResponseWriter, r *http.Request) {
	var a models.ServiceArea
	var f int
	err := s.DB.QueryRow(`SELECT id, slug, city, state, zip_codes, blurb, featured FROM service_areas WHERE slug = ?`,
		chi.URLParam(r, "slug")).Scan(&a.ID, &a.Slug, &a.City, &a.State, &a.ZipCodes, &a.Blurb, &f)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "area not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	a.Featured = f == 1
	writeJSON(w, http.StatusOK, a)
}

// ---- Testimonials / FAQs / Promotions -------------------------------------

func (s *Server) listTestimonials(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT id, author, location, rating, quote, service, source, reviewed_at
		FROM testimonials WHERE published = 1 ORDER BY reviewed_at DESC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	out := []models.Testimonial{}
	for rows.Next() {
		var t models.Testimonial
		if err := rows.Scan(&t.ID, &t.Author, &t.Location, &t.Rating, &t.Quote, &t.Service, &t.Source, &t.ReviewedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		out = append(out, t)
	}
	w.Header().Set("Cache-Control", "public, max-age=300")
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listFAQs(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT id, question, answer FROM faqs ORDER BY sort_order`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	out := []models.FAQ{}
	for rows.Next() {
		var f models.FAQ
		if err := rows.Scan(&f.ID, &f.Question, &f.Answer); err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		out = append(out, f)
	}
	w.Header().Set("Cache-Control", "public, max-age=300")
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listPromotions(w http.ResponseWriter, r *http.Request) {
	// Expired offers are hidden automatically.
	rows, err := s.DB.Query(`SELECT id, title, description, badge, code, expires_at FROM promotions
		WHERE active = 1 AND (expires_at IS NULL OR expires_at >= date('now')) ORDER BY id`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	out := []models.Promotion{}
	for rows.Next() {
		var p models.Promotion
		var exp sql.NullString
		if err := rows.Scan(&p.ID, &p.Title, &p.Description, &p.Badge, &p.Code, &exp); err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		if exp.Valid {
			v := exp.String
			p.ExpiresAt = &v
		}
		out = append(out, p)
	}
	w.Header().Set("Cache-Control", "public, max-age=300")
	writeJSON(w, http.StatusOK, out)
}

// ---- Blog ------------------------------------------------------------------

func (s *Server) listPosts(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT id, slug, title, excerpt, category, read_minutes, published_at
		FROM posts WHERE published = 1 AND published_at <= date('now') ORDER BY published_at DESC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	out := []models.Post{}
	for rows.Next() {
		var p models.Post
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Category, &p.ReadMinutes, &p.PublishedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		out = append(out, p)
	}
	w.Header().Set("Cache-Control", "public, max-age=120")
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) getPost(w http.ResponseWriter, r *http.Request) {
	var p models.Post
	err := s.DB.QueryRow(`SELECT id, slug, title, excerpt, body, category, read_minutes, published_at
		FROM posts WHERE slug = ? AND published = 1`, chi.URLParam(r, "slug")).
		Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Body, &p.Category, &p.ReadMinutes, &p.PublishedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "post not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	writeJSON(w, http.StatusOK, p)
}
