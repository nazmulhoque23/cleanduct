// Package handlers wires HTTP routes to the database.
package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"ductcleaning/internal/config"
	"ductcleaning/internal/notify"
)

type Server struct {
	DB       *sql.DB
	Cfg      config.Config
	Notifier notify.Notifier
	limiter  *rateLimiter
}

func New(db *sql.DB, cfg config.Config, n notify.Notifier) *Server {
	return &Server{DB: db, Cfg: cfg, Notifier: n, limiter: newRateLimiter(5, time.Minute)}
}

// Router builds the full chi router: /api/* JSON routes plus an optional
// static SPA handler for the built frontend.
func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RealIP)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(15 * time.Second))
	r.Use(middleware.Compress(5))

	if s.Cfg.CORSOrigin != "" {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   strings.Split(s.Cfg.CORSOrigin, ","),
			AllowedMethods:   []string{"GET", "POST", "PATCH", "OPTIONS"},
			AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
			AllowCredentials: false,
			MaxAge:           300,
		}))
	}

	r.Route("/api", func(api chi.Router) {
		api.Get("/health", s.health)
		api.Get("/site", s.getSite)
		api.Get("/services", s.listServices)
		api.Get("/services/{slug}", s.getService)
		api.Get("/service-areas", s.listServiceAreas)
		api.Get("/service-areas/{slug}", s.getServiceArea)
		api.Get("/testimonials", s.listTestimonials)
		api.Get("/faqs", s.listFAQs)
		api.Get("/promotions", s.listPromotions)
		api.Get("/posts", s.listPosts)
		api.Get("/posts/{slug}", s.getPost)
		api.Post("/leads", s.createLead)

		if s.Cfg.AdminToken != "" {
			api.Route("/admin", func(admin chi.Router) {
				admin.Use(s.requireAdmin)
				admin.Get("/leads", s.adminListLeads)
				admin.Patch("/leads/{id}", s.adminUpdateLead)
			})
		}

		api.NotFound(func(w http.ResponseWriter, r *http.Request) {
			writeError(w, http.StatusNotFound, "not found")
		})
	})

	if s.Cfg.StaticDir != "" {
		r.Handle("/*", spaHandler(s.Cfg.StaticDir))
	}
	return r
}

// ---- helpers -------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.DB.Ping(); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) getSite(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=300")
	writeJSON(w, http.StatusOK, s.Cfg.Site)
}

func (s *Server) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") || strings.TrimPrefix(auth, "Bearer ") != s.Cfg.AdminToken {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// spaHandler serves the Vite build. Unknown paths fall back to index.html
// so React Router can handle client-side routes.
func spaHandler(dir string) http.Handler {
	fs := http.FileServer(http.Dir(dir))
	index := filepath.Join(dir, "index.html")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(dir, filepath.Clean("/"+r.URL.Path))
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			// Hashed assets are immutable; index.html should not be cached.
			if strings.HasPrefix(r.URL.Path, "/assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			fs.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, index)
	})
}
