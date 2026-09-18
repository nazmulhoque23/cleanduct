package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"ductcleaning/internal/models"
)

// SEO for a single-page app without a Node SSR server: when Go serves
// index.html it rewrites <title>, meta description, canonical, Open Graph
// tags and injects JSON-LD structured data for the requested route. Crawlers
// and link previews therefore see correct per-page metadata immediately,
// while React still renders the body.

var (
	reTitle = regexp.MustCompile(`(?is)<title>.*?</title>`)
	reDesc  = regexp.MustCompile(`(?is)<meta\s+name="description"\s+content="[^"]*"\s*/?>`)
)

type pageMeta struct {
	Title       string
	Description string
	Path        string
	Type        string // website | article
	NoIndex     bool
	JSONLD      []any
	Status      int
}

type indexCache struct {
	mu      sync.Mutex
	body    []byte
	modTime time.Time
	path    string
}

func (c *indexCache) get() ([]byte, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	st, err := os.Stat(c.path)
	if err != nil {
		return nil, err
	}
	if c.body == nil || st.ModTime().After(c.modTime) {
		b, err := os.ReadFile(c.path)
		if err != nil {
			return nil, err
		}
		c.body, c.modTime = b, st.ModTime()
	}
	return c.body, nil
}

// spaHandler serves the Vite build with per-route SEO injection.
func (s *Server) spaHandler(dir string) http.Handler {
	fs := http.FileServer(http.Dir(dir))
	index := &indexCache{path: filepath.Join(dir, "index.html")}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(dir, filepath.Clean("/"+r.URL.Path))
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			if strings.HasPrefix(r.URL.Path, "/assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			fs.ServeHTTP(w, r)
			return
		}

		raw, err := index.get()
		if err != nil {
			http.Error(w, "frontend build not found", http.StatusNotFound)
			return
		}
		meta := s.metaFor(r.URL.Path)
		out := s.injectMeta(raw, meta)

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		if meta.Status == 0 {
			meta.Status = http.StatusOK
		}
		w.WriteHeader(meta.Status)
		_, _ = w.Write(out)
	})
}

func (s *Server) injectMeta(raw []byte, m pageMeta) []byte {
	site := s.Cfg.Site
	url := s.Cfg.PublicURL + m.Path
	ogImage := s.Cfg.PublicURL + "/og.png"

	var head bytes.Buffer
	head.WriteString(fmt.Sprintf(`<link rel="canonical" href="%s">`, html.EscapeString(url)))
	if m.NoIndex {
		head.WriteString(`<meta name="robots" content="noindex,follow">`)
	}
	head.WriteString(fmt.Sprintf(`<meta property="og:type" content="%s">`, m.Type))
	head.WriteString(fmt.Sprintf(`<meta property="og:site_name" content="%s">`, html.EscapeString(site.Name)))
	head.WriteString(fmt.Sprintf(`<meta property="og:title" content="%s">`, html.EscapeString(m.Title)))
	head.WriteString(fmt.Sprintf(`<meta property="og:description" content="%s">`, html.EscapeString(m.Description)))
	head.WriteString(fmt.Sprintf(`<meta property="og:url" content="%s">`, html.EscapeString(url)))
	head.WriteString(fmt.Sprintf(`<meta property="og:image" content="%s">`, html.EscapeString(ogImage)))
	head.WriteString(`<meta name="twitter:card" content="summary_large_image">`)
	head.WriteString(fmt.Sprintf(`<meta name="twitter:title" content="%s">`, html.EscapeString(m.Title)))
	head.WriteString(fmt.Sprintf(`<meta name="twitter:description" content="%s">`, html.EscapeString(m.Description)))
	head.WriteString(fmt.Sprintf(`<meta name="twitter:image" content="%s">`, html.EscapeString(ogImage)))

	// LocalBusiness on every page + page-specific entities.
	ld := append([]any{s.localBusinessLD()}, m.JSONLD...)
	for _, item := range ld {
		b, err := json.Marshal(item)
		if err != nil {
			continue
		}
		// Prevent </script> injection from content.
		safe := strings.ReplaceAll(string(b), "</", `<\/`)
		head.WriteString(`<script type="application/ld+json">` + safe + `</script>`)
	}

	out := reTitle.ReplaceAll(raw, []byte("<title>"+html.EscapeString(m.Title)+"</title>"))
	out = reDesc.ReplaceAll(out, []byte(`<meta name="description" content="`+html.EscapeString(m.Description)+`" />`))
	return bytes.Replace(out, []byte("</head>"), append(head.Bytes(), []byte("</head>")...), 1)
}

// ---- Route → metadata ----------------------------------------------------------

func (s *Server) metaFor(path string) pageMeta {
	site := s.Cfg.Site
	path = strings.TrimSuffix(path, "/")
	if path == "" {
		path = "/"
	}
	base := pageMeta{Path: path, Type: "website"}

	switch {
	case path == "/":
		base.Title = site.Name + " | Air Duct & Dryer Vent Cleaning in Schaumburg & Chicagoland"
		base.Description = "Professional air duct, dryer vent and chimney cleaning across Chicagoland. Upfront pricing, camera-verified results and a 100% satisfaction guarantee."
		base.JSONLD = append(base.JSONLD, s.faqLD())
		base.Path = ""
	case path == "/services":
		base.Title = "Services | " + site.Name
		base.Description = "Air duct cleaning, dryer vent cleaning, chimney sweeps, UV purification, sanitizing and commercial service across Chicagoland."
		base.JSONLD = append(base.JSONLD, s.breadcrumbLD([][2]string{{"Home", "/"}, {"Services", "/services"}}))
	case strings.HasPrefix(path, "/services/"):
		slug := strings.TrimPrefix(path, "/services/")
		svc, err := s.serviceBySlug(slug)
		if err != nil {
			return s.notFoundMeta(path)
		}
		base.Title = svc.Name + " in Schaumburg & Chicagoland | " + site.Name
		base.Description = svc.ShortDesc
		base.JSONLD = append(base.JSONLD, s.serviceLD(svc), s.breadcrumbLD([][2]string{{"Home", "/"}, {"Services", "/services"}, {svc.Name, path}}))
	case path == "/service-areas":
		base.Title = "Service Areas | " + site.Name
		base.Description = "Air duct and dryer vent cleaning in Chicago and 40+ suburbs across Cook, Lake, DuPage and Kane counties."
	case strings.HasPrefix(path, "/service-areas/"):
		slug := strings.TrimPrefix(path, "/service-areas/")
		area, err := s.areaBySlug(slug)
		if err != nil {
			return s.notFoundMeta(path)
		}
		base.Title = "Air Duct Cleaning in " + area.City + ", " + area.State + " | " + site.Name
		base.Description = area.Blurb
		base.JSONLD = append(base.JSONLD, s.breadcrumbLD([][2]string{{"Home", "/"}, {"Service Areas", "/service-areas"}, {area.City, path}}))
	case path == "/about":
		base.Title = "About | " + site.Name
		base.Description = fmt.Sprintf("Family-owned duct cleaning company based in Schaumburg, serving Chicagoland since %d.", site.YearFounded)
	case path == "/reviews":
		base.Title = "Reviews | " + site.Name
		base.Description = fmt.Sprintf("%.1f stars from %d verified Chicagoland homeowners.", site.Rating, site.ReviewCount)
	case path == "/blog":
		base.Title = "Tips & Advice | " + site.Name
		base.Description = "Practical advice on indoor air quality, dryer vent safety and HVAC maintenance from Chicagoland duct cleaning pros."
	case strings.HasPrefix(path, "/blog/"):
		slug := strings.TrimPrefix(path, "/blog/")
		post, err := s.postBySlug(slug)
		if err != nil {
			return s.notFoundMeta(path)
		}
		base.Title = post.Title + " | " + site.Name
		base.Description = post.Excerpt
		base.Type = "article"
		base.JSONLD = append(base.JSONLD, s.articleLD(post, path), s.breadcrumbLD([][2]string{{"Home", "/"}, {"Blog", "/blog"}, {post.Title, path}}))
	case path == "/contact":
		base.Title = "Contact & Free Quote | " + site.Name
		base.Description = "Request a free duct cleaning quote online or call us. Same-week appointments across Chicagoland."
		base.JSONLD = append(base.JSONLD, s.faqLD())
	case path == "/book":
		base.Title = "Book Online | " + site.Name
		base.Description = "Pick a date and arrival window for your air duct, dryer vent or chimney cleaning. Same-week appointments available."
	case path == "/privacy":
		base.Title, base.Description = "Privacy Policy | "+site.Name, "How "+site.Name+" handles the information you share with us."
	case path == "/terms":
		base.Title, base.Description = "Terms of Service | "+site.Name, "Quotes, guarantees and promotion terms for "+site.Name+"."
	case strings.HasPrefix(path, "/admin"):
		base.Title, base.Description, base.NoIndex = "Admin | "+site.Name, "", true
	default:
		return s.notFoundMeta(path)
	}
	return base
}

func (s *Server) notFoundMeta(path string) pageMeta {
	return pageMeta{Path: path, Type: "website", Title: "Page not found | " + s.Cfg.Site.Name, Description: "That page does not exist.", NoIndex: true, Status: http.StatusNotFound}
}

// ---- JSON-LD builders --------------------------------------------------------------

func (s *Server) localBusinessLD() map[string]any {
	site := s.Cfg.Site
	street, city, region, zip := splitAddress(site.Address)
	ld := map[string]any{
		"@context":    "https://schema.org",
		"@type":       "HVACBusiness",
		"@id":         s.Cfg.PublicURL + "/#business",
		"name":        site.Name,
		"url":         s.Cfg.PublicURL,
		"telephone":   site.Phone,
		"email":       site.Email,
		"image":       s.Cfg.PublicURL + "/og.png",
		"priceRange":  "$$",
		"description": "Air duct, dryer vent and chimney cleaning for homes and businesses across Chicagoland.",
		"address": map[string]any{
			"@type": "PostalAddress", "streetAddress": street, "addressLocality": city, "addressRegion": region, "postalCode": zip, "addressCountry": "US",
		},
		"areaServed":                s.areaNames(),
		"openingHoursSpecification": openingHoursLD(site.Hours),
	}
	if site.YearFounded > 0 {
		ld["foundingDate"] = fmt.Sprintf("%d", site.YearFounded)
	}
	if site.ReviewCount > 0 {
		ld["aggregateRating"] = map[string]any{"@type": "AggregateRating", "ratingValue": site.Rating, "reviewCount": site.ReviewCount, "bestRating": 5}
	}
	return ld
}

func (s *Server) serviceLD(svc models.Service) map[string]any {
	ld := map[string]any{
		"@context":    "https://schema.org",
		"@type":       "Service",
		"name":        svc.Name,
		"description": svc.ShortDesc,
		"serviceType": svc.Name,
		"provider":    map[string]any{"@id": s.Cfg.PublicURL + "/#business"},
		"areaServed":  s.areaNames(),
		"url":         s.Cfg.PublicURL + "/services/" + svc.Slug,
	}
	if svc.StartingAt != nil {
		ld["offers"] = map[string]any{"@type": "Offer", "price": *svc.StartingAt, "priceCurrency": "USD", "description": "Starting price"}
	}
	return ld
}

func (s *Server) articleLD(p models.Post, path string) map[string]any {
	return map[string]any{
		"@context":       "https://schema.org",
		"@type":          "BlogPosting",
		"headline":       p.Title,
		"description":    p.Excerpt,
		"datePublished":  p.PublishedAt,
		"articleSection": p.Category,
		"url":            s.Cfg.PublicURL + path,
		"author":         map[string]any{"@type": "Organization", "name": s.Cfg.Site.Name},
		"publisher":      map[string]any{"@id": s.Cfg.PublicURL + "/#business"},
	}
}

func (s *Server) breadcrumbLD(items [][2]string) map[string]any {
	list := make([]map[string]any, 0, len(items))
	for i, it := range items {
		list = append(list, map[string]any{"@type": "ListItem", "position": i + 1, "name": it[0], "item": s.Cfg.PublicURL + strings.TrimSuffix(it[1], "/")})
	}
	return map[string]any{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": list}
}

func (s *Server) faqLD() map[string]any {
	rows, err := s.DB.Query(`SELECT question, answer FROM faqs ORDER BY sort_order LIMIT 10`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var qs []map[string]any
	for rows.Next() {
		var q, a string
		if err := rows.Scan(&q, &a); err == nil {
			qs = append(qs, map[string]any{"@type": "Question", "name": q, "acceptedAnswer": map[string]any{"@type": "Answer", "text": a}})
		}
	}
	if len(qs) == 0 {
		return nil
	}
	return map[string]any{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": qs}
}

// ---- Sitemap & robots ---------------------------------------------------------------

func (s *Server) sitemap(w http.ResponseWriter, r *http.Request) {
	type entry struct{ loc, changefreq, priority string }
	entries := []entry{
		{"/", "weekly", "1.0"}, {"/services", "monthly", "0.9"}, {"/service-areas", "monthly", "0.8"},
		{"/about", "yearly", "0.5"}, {"/reviews", "weekly", "0.6"}, {"/blog", "weekly", "0.6"},
		{"/contact", "yearly", "0.8"}, {"/book", "yearly", "0.8"},
	}
	addFrom := func(q, prefix, freq, prio string) {
		rows, err := s.DB.Query(q)
		if err != nil {
			return
		}
		defer rows.Close()
		for rows.Next() {
			var slug string
			if err := rows.Scan(&slug); err == nil {
				entries = append(entries, entry{prefix + slug, freq, prio})
			}
		}
	}
	addFrom(`SELECT slug FROM services ORDER BY sort_order`, "/services/", "monthly", "0.8")
	addFrom(`SELECT slug FROM service_areas ORDER BY city`, "/service-areas/", "monthly", "0.7")
	addFrom(`SELECT slug FROM posts WHERE published = 1 AND published_at <= date('now') ORDER BY published_at DESC`, "/blog/", "monthly", "0.5")

	var b bytes.Buffer
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")
	for _, e := range entries {
		loc := s.Cfg.PublicURL + strings.TrimSuffix(e.loc, "/")
		b.WriteString(fmt.Sprintf("  <url><loc>%s</loc><changefreq>%s</changefreq><priority>%s</priority></url>\n", html.EscapeString(loc), e.changefreq, e.priority))
	}
	b.WriteString("</urlset>\n")
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = w.Write(b.Bytes())
}

func (s *Server) robots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	fmt.Fprintf(w, "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: %s/sitemap.xml\n", s.Cfg.PublicURL)
}

// ---- Security headers -------------------------------------------------------------------

func (s *Server) securityHeaders(next http.Handler) http.Handler {
	csp := strings.Join([]string{
		"default-src 'self'",
		"script-src 'self' https://www.googletagmanager.com https://plausible.io",
		"connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com https://plausible.io",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: https:",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	}, "; ")
	https := strings.HasPrefix(s.Cfg.PublicURL, "https://")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		h.Set("Content-Security-Policy", csp)
		if https {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
}

// ---- small DB helpers -----------------------------------------------------------------------

func (s *Server) serviceBySlug(slug string) (models.Service, error) {
	return scanService(s.DB.QueryRow(`SELECT `+serviceCols+` FROM services WHERE slug = ?`, slug))
}

func (s *Server) areaBySlug(slug string) (models.ServiceArea, error) {
	var a models.ServiceArea
	var f int
	err := s.DB.QueryRow(`SELECT id, slug, city, state, zip_codes, blurb, featured, intro, neighborhoods FROM service_areas WHERE slug = ?`, slug).
		Scan(&a.ID, &a.Slug, &a.City, &a.State, &a.ZipCodes, &a.Blurb, &f, &a.Intro, &a.Neighborhoods)
	return a, err
}

func (s *Server) postBySlug(slug string) (models.Post, error) {
	var p models.Post
	err := s.DB.QueryRow(`SELECT id, slug, title, excerpt, category, read_minutes, published_at FROM posts WHERE slug = ? AND published = 1`, slug).
		Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Category, &p.ReadMinutes, &p.PublishedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return p, err
	}
	return p, err
}

func (s *Server) areaNames() []map[string]any {
	rows, err := s.DB.Query(`SELECT city, state FROM service_areas ORDER BY featured DESC, city LIMIT 40`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var c, st string
		if err := rows.Scan(&c, &st); err == nil {
			out = append(out, map[string]any{"@type": "City", "name": c + ", " + st})
		}
	}
	return out
}

// splitAddress turns "7 N Roselle Rd, Schaumburg, IL 60193" into parts.
func splitAddress(addr string) (street, city, region, zip string) {
	parts := strings.Split(addr, ",")
	if len(parts) >= 1 {
		street = strings.TrimSpace(parts[0])
	}
	if len(parts) >= 2 {
		city = strings.TrimSpace(parts[1])
	}
	if len(parts) >= 3 {
		rz := strings.Fields(strings.TrimSpace(parts[2]))
		if len(rz) >= 1 {
			region = rz[0]
		}
		if len(rz) >= 2 {
			zip = rz[1]
		}
	}
	return
}

// openingHoursLD converts "Mon–Fri 7:00 AM – 8:00 PM" style strings into schema.org specs (best effort).
func openingHoursLD(hours []string) []map[string]any {
	days := map[string]string{"Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday", "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday", "Sun": "Sunday"}
	order := []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
	var out []map[string]any
	for _, h := range hours {
		h = strings.ReplaceAll(h, "–", "-")
		if strings.Contains(strings.ToLower(h), "closed") {
			continue
		}
		fields := strings.Fields(h)
		if len(fields) < 2 {
			continue
		}
		var dayList []string
		if strings.Contains(fields[0], "-") {
			rng := strings.SplitN(fields[0], "-", 2)
			in := false
			for _, d := range order {
				if d == rng[0] {
					in = true
				}
				if in {
					dayList = append(dayList, days[d])
				}
				if d == rng[1] {
					break
				}
			}
		} else if full, ok := days[fields[0]]; ok {
			dayList = []string{full}
		}
		times := strings.SplitN(strings.Join(fields[1:], " "), " - ", 2)
		if len(dayList) == 0 || len(times) != 2 {
			continue
		}
		open, err1 := time.Parse("3:04 PM", strings.TrimSpace(times[0]))
		closeT, err2 := time.Parse("3:04 PM", strings.TrimSpace(times[1]))
		if err1 != nil || err2 != nil {
			continue
		}
		out = append(out, map[string]any{"@type": "OpeningHoursSpecification", "dayOfWeek": dayList, "opens": open.Format("15:04"), "closes": closeT.Format("15:04")})
	}
	return out
}
