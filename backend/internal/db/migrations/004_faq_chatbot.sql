-- 004 — FAQ entries double as the chatbot's predefined answers.
-- keywords: extra trigger words (comma-separated) so the chatbot matches an entry
--           even when the customer phrases it differently.
-- show_on_site: 0 = chatbot-only answer (hidden from the public FAQ page).

ALTER TABLE faqs ADD COLUMN keywords TEXT NOT NULL DEFAULT '';
ALTER TABLE faqs ADD COLUMN show_on_site INTEGER NOT NULL DEFAULT 1;
