-- 003 — chatbot transcripts (for the admin "Chats" view and quality review)

CREATE TABLE IF NOT EXISTS chat_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,
  role        TEXT NOT NULL,             -- user | assistant
  content     TEXT NOT NULL,
  page        TEXT NOT NULL DEFAULT '',
  ip          TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at DESC);
