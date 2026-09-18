# CleanDuct — Duct Cleaning Website

Repo: https://github.com/nazmulhoque23/cleanduct

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

**Admin panel:** start the API with `ADMIN_TOKEN=devtoken` (any secret string), open
http://localhost:5173/admin and sign in with that token. From there you can work leads and
online bookings (status changes) and edit services, service areas, promotions, reviews, FAQs and
blog posts without touching code.

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
| `ADMIN_TOKEN` | Enables the admin panel + `/api/admin/*` (bearer auth) |
| `PUBLIC_URL` | Canonical site URL for SEO tags, sitemap and HSTS (e.g. `https://cleanduct.com`) |
| `RESEND_API_KEY` **or** `SMTP_*`, `NOTIFY_FROM/TO` | Email owner on every lead/booking + confirmation to the customer (logged only if unset) |
| `TWILIO_SID/TOKEN/FROM/TO` | Also text the owner on every lead/booking |
| `BOOKING_CAPACITY/DAYS/LEAD_DAYS/WINDOWS` | Online booking calendar rules (jobs per window, how far ahead, arrival windows) |
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
| POST | `/api/leads` | quote form; validation, honeypot, 5 req/min per IP, SMS consent |
| GET | `/api/availability` | bookable days + remaining capacity per arrival window |
| POST | `/api/bookings` | online booking request (validated against availability) |
| POST | `/api/chat` | website assistant (rule-based or Claude), 20 req/min per IP |
| GET | `/sitemap.xml`, `/robots.txt` | generated from the database |
| GET | `/api/admin/leads`, `/api/admin/bookings` | requires `Authorization: Bearer $ADMIN_TOKEN` |
| PATCH | `/api/admin/leads/{id}`, `/api/admin/bookings/{id}` | `{ "status": "…" }` |
| GET | `/api/admin/chats` | recent chat transcripts |
| GET | `/api/admin/schema` | field definitions the admin UI builds forms from |
| GET/POST | `/api/admin/content/{resource}` | list/create — resources: services, service-areas, testimonials, faqs, promotions, posts |
| PATCH/DELETE | `/api/admin/content/{resource}/{id}` | update/delete |

## Editing content

Use the admin panel at `/admin`. Seed content in `backend/internal/db/seed.go` is only inserted
the first time the database is created; after that, the database is the source of truth. To start
over from the seed: stop the server, delete `backend/data/site.db`, start again.

## SEO

Go injects per-route `<title>`, meta description, canonical, Open Graph/Twitter tags and JSON-LD
(`HVACBusiness` with address/hours/rating on every page, `Service`, `BlogPosting`, `FAQPage`,
`BreadcrumbList`) into `index.html` before serving it, so crawlers and link previews get correct
metadata without a Node SSR server. `/sitemap.xml` and `/robots.txt` are generated from the database.
Set `PUBLIC_URL` to the real domain in production. The share image is `frontend/public/og.png`.

## Chatbot

A floating assistant answers questions strictly from the site's own content (services, prices, areas,
hours, booking, FAQs) and redirects anything else. Works out of the box in rule-based mode; set
`ANTHROPIC_API_KEY` for conversational answers (still fenced by a strict system prompt with rule-based
fallback). Transcripts are in **Admin › Chats**. Details: `docs/chatbot.md`.

## Email & SMS

Owner alerts + customer confirmations for every lead and booking via Resend or SMTP, optional Twilio SMS.
Details and setup: `docs/email-notifications.md`.

## Theme

Dark is the default (brand). The sun/moon switch in the header (and admin sidebar) flips to a light
theme; the choice is stored in `localStorage` and applied before first paint by a tiny inline script in
`frontend/index.html`. That script is whitelisted in the CSP by SHA-256 hash in
`backend/internal/handlers/seo.go` — if you change the script, recompute the hash
(`echo -n '<script body>' | openssl dgst -sha256 -binary | base64`). Light-mode colours live in
`frontend/src/index.css` under `:root[data-theme='light']`.

## Analytics

Optional, set at build time in `frontend/.env`: `VITE_GA_ID` (GA4) and/or `VITE_PLAUSIBLE_DOMAIN`.
Events: `page_view`, `lead_submit`, `booking_submit`, `phone_click`, `cta_click`.

## Tests & CI

`cd backend && go test ./...` covers lead validation, rate limiting, booking availability/capacity,
admin auth and CRUD, sitemap/robots and security headers. `.github/workflows/ci.yml` runs vet,
tests, lint, both builds and a Docker image build on every push.

## Frontend notes

- Routing: `react-router-dom` v7, all routes in `src/App.tsx`.
- Styling: Tailwind v4 with design tokens in `src/index.css` (`@theme`). Change the brand palette there.
- Fonts: Sora (display) + Inter (body) from Google Fonts, loaded in `index.html`.
- Images: drop real photos into `frontend/public/images/` using the filenames in `public/images/README.md`;
  the `SmartImage` component shows SVG placeholders until each file exists.
- SEO: per-page `<title>`/description via `useSeo()`. For stronger local SEO later, add
  prerendering (e.g. `vite-plugin-prerender`) or move to SSR.

## Roadmap ideas

- Google Reviews import via the Business Profile API
- Full prerendering/SSR if search visibility needs a further push
- Photo upload from the admin panel (currently drop files into `frontend/public/images/`)
