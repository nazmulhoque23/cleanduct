# CleanDuct — SEO & Lead Generation

What is implemented, where it lives in the code, and what still needs a human (accounts, real data).
Companion to `README.md`. Last updated: September 2026.

---

## 1. SEO

### 1.1 Server-injected metadata (per route)

The frontend is a React single-page app. To avoid the classic SPA problem (every URL looks identical to
crawlers), the Go server rewrites `index.html` for each request before serving it.

File: `backend/internal/handlers/seo.go` (`spaHandler`, `metaFor`, `injectMeta`).

For every route it sets:

| Tag | Example (service page) |
|---|---|
| `<title>` | Dryer Vent Cleaning in Schaumburg & Chicagoland \| CleanDuct |
| `<meta name="description">` | the service's short description |
| `<link rel="canonical">` | `PUBLIC_URL` + path |
| Open Graph | `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` |
| Twitter | `summary_large_image` + title/description/image |
| Robots | `noindex,follow` on `/admin*` and unknown URLs (served with HTTP 404) |

Route → title mapping (all end with `| CleanDuct`):

- `/` — "CleanDuct | Air Duct & Dryer Vent Cleaning in Schaumburg & Chicagoland"
- `/services/{slug}` — "{Service} in Schaumburg & Chicagoland"
- `/service-areas/{slug}` — "Air Duct Cleaning in {City}, IL"
- `/blog/{slug}` — post title (`og:type=article`)
- `/services`, `/service-areas`, `/about`, `/reviews`, `/blog`, `/contact`, `/book`, `/privacy`, `/terms` — static titles

The React app also sets `document.title` on client-side navigation (`useSeo()` in `frontend/src/lib/hooks.ts`)
so the tab title stays right after in-app clicks.

### 1.2 Structured data (JSON-LD)

Injected into `<head>` by the same handler. Rich-result eligible types:

- **`HVACBusiness`** on every page — name, URL, phone, email, street address (7 N Roselle Rd, Schaumburg,
  IL 60193), `openingHoursSpecification` parsed from `SITE_HOURS`, `foundingDate`, `areaServed` (list of
  cities from the DB), `aggregateRating` (from `SITE_RATING` / `SITE_REVIEW_COUNT`), `priceRange`.
- **`Service`** on each service page — name, description, provider link, `Offer` with starting price.
- **`BlogPosting`** on each article — headline, description, `datePublished`, section, author/publisher.
- **`FAQPage`** on `/` and `/contact` — first 10 FAQs from the DB.
- **`BreadcrumbList`** on services, service areas and posts.

Content is JSON-escaped and `</` is neutralised so admin-entered text cannot break out of the script tag.

### 1.3 Local-search content

- **24 service-area pages** (`/service-areas/{city}`), each with a unique intro paragraph and a
  neighborhoods list (columns `intro`, `neighborhoods`, migration `002`). Not duplicate content.
- **9 service pages** with distinct long descriptions and starting prices.
- **6 blog posts** targeting search intent (signs you need cleaning, how often, sanitizing, dryer-vent fire
  safety, chimney checklist, what to expect).
- All editable in the admin panel; new items appear in the sitemap automatically.

### 1.4 Crawl & share plumbing

- `/sitemap.xml` — generated from the DB (static routes + services + areas + published posts), ~47 URLs.
- `/robots.txt` — allows all, disallows `/admin` and `/api/`, links the sitemap.
- `frontend/public/og.png` — 1200×630 branded share image.
- Hashed `/assets/*` cached for a year; `index.html` `no-cache`.
- Security headers (CSP, HSTS on https, `X-Frame-Options`, referrer policy) — good for trust and Lighthouse.
- Mobile-first layout, semantic headings, `<meta theme-color>`, fonts preconnected.

### 1.5 SEO checklist — needs you

- [ ] Set `PUBLIC_URL=https://your-real-domain` in production (canonicals, sitemap, OG, HSTS depend on it).
- [ ] Replace placeholder phone, email, hours, rating and review count in `backend/.env`.
- [ ] Claim/verify the **Google Business Profile** and make sure name/address/phone match the site exactly.
- [ ] Add the site to **Google Search Console** and submit `https://your-domain/sitemap.xml`.
- [ ] Add the site to **Bing Webmaster Tools** (imports from Search Console).
- [ ] Drop real photos into `frontend/public/images/` (see that folder's README) — image search + trust.
- [ ] Optional later: full prerendering/SSR if you want body text in the initial HTML; current setup already
      gives crawlers all metadata and structured data.

---

## 2. Lead generation

### 2.1 Capture points

| Where | What |
|---|---|
| Homepage hero | compact quote form + "Book online" + click-to-call |
| `/contact` | full quote form + phone/email/hours/office cards |
| Every service page, service-area page, blog post | sticky sidebar quote form |
| `/book` | self-serve appointment request with date + arrival-window picker |
| Header (desktop) | phone with "Call or text" + "Get a Free Quote" |
| Mobile | sticky bottom bar: "Call now" / "Free quote" |
| Every page bottom | "Book your cleaning this week" CTA banner |
| Promotions section | time-limited codes (auto-hide after `expires_at`) |

### 2.2 Conversion/trust elements

Review badge (header, hero, footer), testimonial carousel and `/reviews` wall, trust bar (licensed & insured,
camera-verified, flat-rate, NADCA), before/after slider, 4-step process, FAQ answering price and "do I need
this", satisfaction guarantee copy, per-city local copy.

### 2.3 What happens to a lead

`POST /api/leads` (`backend/internal/handlers/leads.go`):

1. Per-IP rate limit (5/min) and 32 KB body cap.
2. Honeypot field `website` — bots get a fake "ok", nothing is stored.
3. Validation: name, email (RFC parse), phone (10–15 digits), 5-digit ZIP, message length, contact
   preference; **"text" requires the SMS-consent checkbox** (TCPA-style wording on both forms).
4. Stored in SQLite (`leads` table) with source page, IP, consent flag, status `new`.
5. Notifications fire asynchronously (`backend/internal/notify`):
   - owner email (Resend HTTP API **or** SMTP),
   - customer confirmation email,
   - optional owner SMS via Twilio.
   Nothing configured → logged only.

`POST /api/bookings` (`bookings.go`) does the same for appointment requests, additionally validating the
slot against live availability (`GET /api/availability`: capacity per window, lead time, closed days —
all env-configurable).

### 2.4 Working leads

Admin panel `/admin` (token = `ADMIN_TOKEN`):

- **Leads** inbox — filter by status, click-to-call/mail, source page, consent flag, pipeline
  `new → contacted → booked → closed`.
- **Bookings** inbox — date/window/service/address, pipeline `requested → confirmed → completed → cancelled`.
- Content editors for services, service areas, promotions, reviews, FAQs and posts.

### 2.5 Measurement

`frontend/src/lib/analytics.ts` — enable with `VITE_GA_ID` (GA4) and/or `VITE_PLAUSIBLE_DOMAIN`.
Events: `page_view`, `lead_submit` (service, page), `booking_submit` (service, window), `phone_click`
(any `tel:` link, with page), `cta_click` (elements with `data-cta`).

### 2.6 Lead-gen checklist — needs you

- [ ] `RESEND_API_KEY` (or `SMTP_*`) + `NOTIFY_FROM` (verified sender) + `NOTIFY_TO` — otherwise no one is
      emailed.
- [ ] Optional `TWILIO_*` for SMS alerts.
- [ ] Real phone number in `SITE_PHONE` (every CTA uses it).
- [ ] Real reviews and photos (biggest conversion lift left).
- [ ] Set booking rules that match the crew: `BOOKING_CAPACITY`, `BOOKING_WINDOWS`, `BOOKING_LEAD_DAYS`.
- [ ] Analytics ID(s) at build time.
- [ ] Optional: connect a call-tracking number to attribute phone calls by source.
