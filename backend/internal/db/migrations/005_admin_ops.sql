-- 005 — owner operations: booking decisions & pricing, editable settings, blocked dates

ALTER TABLE bookings ADD COLUMN quoted_price INTEGER;          -- whole dollars, NULL = not quoted yet
ALTER TABLE bookings ADD COLUMN admin_note TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN decline_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';

ALTER TABLE leads ADD COLUMN admin_note TEXT NOT NULL DEFAULT '';

-- Business settings editable in the admin panel. Keys mirror the SITE_* /
-- BOOKING_* environment variables; a row here overrides the env default.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Days the crew is unavailable (holidays, vacation, fully booked offline).
CREATE TABLE IF NOT EXISTS blocked_dates (
  date       TEXT PRIMARY KEY,   -- YYYY-MM-DD
  reason     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
