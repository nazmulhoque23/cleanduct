-- 002 — bookings, SMS consent, richer service-area copy

ALTER TABLE leads ADD COLUMN sms_consent INTEGER NOT NULL DEFAULT 0;

ALTER TABLE service_areas ADD COLUMN intro TEXT NOT NULL DEFAULT '';
ALTER TABLE service_areas ADD COLUMN neighborhoods TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS bookings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT NOT NULL,
  address      TEXT NOT NULL DEFAULT '',
  zip_code     TEXT NOT NULL DEFAULT '',
  service      TEXT NOT NULL,
  slot_date    TEXT NOT NULL,             -- YYYY-MM-DD
  slot_window  TEXT NOT NULL,             -- e.g. "08:00-10:00"
  notes        TEXT NOT NULL DEFAULT '',
  sms_consent  INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'requested', -- requested | confirmed | completed | cancelled
  ip           TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_date, slot_window);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);
