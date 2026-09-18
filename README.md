# CleanDuct — Duct Cleaning Website

A lead-generation website for an air duct / dryer vent / chimney cleaning business, modelled on
the structure of established local HVAC sites: hero + quote form, service pages, geo-targeted
service-area pages, reviews, promotions, FAQ, blog and a sticky call bar on mobile.

> **Placeholder details.** The phone number, address, reviews and prices are
> invented. Swap them via `backend/.env` (site identity) and `backend/internal/db/seed.go`
> (content), or wire up the admin API and edit content in the database.

```
duct-cleaning/
├── backend/    Go 1.24 API + static file server (chi router, SQLite via pure-Go driver)
├── frontend/   React 19 + TypeScript + Vite 8 + Tailwind v4 single-page app
├── Dockerfile / docker-compose.yml
```

## Quick start (development)

Two terminals:

```bash
# 1. API on :8080  (creates ./backend/data/site.db and seeds it on first run)
cd backend
go mod tidy          # first time only — downloads modules
go run ./cmd/server

# 2. Frontend on :5173 (proxies /api → :8080)
cd frontend
npm install          # first time only
npm run dev
```

Open http://localhost:5173.

To see leads: set `ADMIN_TOKEN=devtoken` before starting the API, then

```bash
curl -H 'Authorization: Bearer devtoken' localhost:8080/api/admin/leads
```

## Production build (single Go binary serves everything)

```bash
cd frontend && npm run build && cd ..
cd backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o server ./cmd/server
STATIC_DIR=../frontend/dist CORS_ORIGIN= ./server        # site on http://localhost:8080
```

or with Docker:

```bash
docker compose up --build   # site on http://localhost:8080, DB persisted in a volume
```

Put Caddy / nginx in front for TLS. Example Caddyfile:

```
ducts.example.com {
    reverse_proxy localhost:8080
}
```

## Configuration

All settings are environment variables — see `backend/.env.example`. The important ones:

| Variable | Purpose |
|---|---|
| `SITE_NAME`, `SITE_PHONE`, `SITE_EMAIL`, `SITE_ADDRESS`, `SITE_HOURS` | Business identity shown in header/footer/contact |
| `SITE_RATING`, `SITE_REVIEW_COUNT` | Review badge numbers |
| `ADMIN_TOKEN` | Enables `/api/admin/leads` (bearer auth) |
| `SMTP_HOST/PORT/USER/PASS`, `NOTIFY_FROM/TO` | Email every new lead to the owner (logged only if unset) |
| `STATIC_DIR` | Path to `frontend/dist`; serve the SPA from Go |
| `CORS_ORIGIN` | Allowed dev origin (`http://localhost:5173`); empty in prod |

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | liveness |
| GET | `/api/site` | business identity for header/footer |
| GET | `/api/services?featured=1&category=residential` | list services |
| GET | `/api/services/{slug}` | one service |
| GET | `/api/service-areas`, `/api/service-areas/{slug}` | geo pages |
| GET | `/api/testimonials`, `/api/faqs`, `/api/promotions` | promotions auto-hide after `expires_at` |
| GET | `/api/posts`, `/api/posts/{slug}` | blog (Markdown body) |
| POST | `/api/leads` | quote form; validation, honeypot, 5 req/min per IP |
| GET | `/api/admin/leads` | requires `Authorization: Bearer $ADMIN_TOKEN` |
| PATCH | `/api/admin/leads/{id}` | `{ "status": "new|contacted|booked|closed" }` |

## Editing content

Right now content lives in `backend/internal/db/seed.go` and is inserted once into SQLite
(when the `services` table is empty). To reseed after editing: stop the server, delete
`backend/data/site.db`, start again. A proper admin UI for editing services/posts/promotions
is the natural next step (the tables are already there).

## Frontend notes

- Routing: `react-router-dom` v7, all routes in `src/App.tsx`.
- Styling: Tailwind v4 with design tokens in `src/index.css` (`@theme`). Change the brand palette there.
- Fonts: Plus Jakarta Sans (display) + Inter (body) from Google Fonts, loaded in `index.html`.
- Images: the before/after slider and service-area map are SVG placeholders — drop real photos into
  `frontend/public/images/` and swap the `<DuctArt>` elements in `BeforeAfter.tsx` for `<img>` tags.
- SEO: per-page `<title>`/description via `useSeo()`. For stronger local SEO later, add
  prerendering (e.g. `vite-plugin-prerender`) or move to SSR.

## Roadmap ideas

- Admin panel (React) for leads, services, promotions and blog posts
- Google Reviews import via the Business Profile API
- Real online scheduling (calendar slots) or Housecall Pro / Jobber webhook
- Structured data (`LocalBusiness`, `Service`, `FAQPage`) and sitemap generation
