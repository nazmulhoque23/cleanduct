-- 001_init.sql — core schema for the duct cleaning site

CREATE TABLE IF NOT EXISTS services (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  short_desc   TEXT NOT NULL,
  long_desc    TEXT NOT NULL,
  icon         TEXT NOT NULL DEFAULT 'wind',
  category     TEXT NOT NULL DEFAULT 'residential', -- residential | commercial
  starting_at  INTEGER,                              -- price in whole dollars, nullable
  featured     INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_areas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  city       TEXT NOT NULL,
  state      TEXT NOT NULL,
  zip_codes  TEXT NOT NULL DEFAULT '',
  blurb      TEXT NOT NULL DEFAULT '',
  featured   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS testimonials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  author      TEXT NOT NULL,
  location    TEXT NOT NULL DEFAULT '',
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quote       TEXT NOT NULL,
  service     TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'Google',
  reviewed_at TEXT NOT NULL,
  published   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS faqs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS promotions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  badge       TEXT NOT NULL DEFAULT '',   -- e.g. "$100 OFF", "25% OFF"
  code        TEXT NOT NULL DEFAULT '',
  expires_at  TEXT,                        -- ISO date; NULL = never
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  excerpt      TEXT NOT NULL,
  body         TEXT NOT NULL,             -- markdown
  category     TEXT NOT NULL DEFAULT 'Tips',
  read_minutes INTEGER NOT NULL DEFAULT 4,
  published_at TEXT NOT NULL,
  published    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS leads (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT NOT NULL,
  zip_code       TEXT NOT NULL DEFAULT '',
  service        TEXT NOT NULL DEFAULT '',
  contact_pref   TEXT NOT NULL DEFAULT 'phone', -- phone | text | email
  message        TEXT NOT NULL DEFAULT '',
  source_page    TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'new',   -- new | contacted | booked | closed
  ip             TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published, published_at DESC);
