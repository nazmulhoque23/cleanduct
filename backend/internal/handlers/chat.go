package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"ductcleaning/internal/chat"
)

const (
	chatMaxTurns   = 12   // history turns forwarded to the model
	chatMaxMessage = 1200 // characters per user message
)

var reSessionID = regexp.MustCompile(`^[A-Za-z0-9_-]{8,64}$`)

type chatRequest struct {
	SessionID string         `json:"sessionId"`
	Page      string         `json:"page"`
	Messages  []chat.Message `json:"messages"`
}

// POST /api/chat
func (s *Server) postChat(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !s.chatLimiter.allow(ip) {
		writeError(w, http.StatusTooManyRequests, "slow down a little — or call us and we'll help right away")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	var in chatRequest
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !reSessionID.MatchString(in.SessionID) {
		writeError(w, http.StatusBadRequest, "bad session id")
		return
	}
	// Sanitise history: only user/assistant roles, trimmed, bounded, must end with a user turn.
	hist := make([]chat.Message, 0, len(in.Messages))
	for _, m := range in.Messages {
		if m.Role != "user" && m.Role != "assistant" {
			continue
		}
		c := strings.TrimSpace(m.Content)
		if c == "" {
			continue
		}
		if len(c) > chatMaxMessage {
			c = c[:chatMaxMessage]
		}
		hist = append(hist, chat.Message{Role: m.Role, Content: c})
	}
	if len(hist) > chatMaxTurns {
		hist = hist[len(hist)-chatMaxTurns:]
	}
	if len(hist) == 0 || hist[len(hist)-1].Role != "user" {
		writeError(w, http.StatusBadRequest, "last message must be from the user")
		return
	}
	// Anthropic requires alternating roles starting with user; drop leading assistant turns.
	for len(hist) > 0 && hist[0].Role != "user" {
		hist = hist[1:]
	}

	kb, err := chat.Load(s.DB, s.rt().Site, s.rt().Windows, s.rt().LeadDays)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "assistant unavailable")
		return
	}
	system := kb.SystemPrompt()

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	var reply string
	var provider string
	if s.Chat != nil {
		reply, err = s.Chat.Reply(ctx, system, hist)
		provider = "llm"
		if err != nil {
			log.Printf("chat: llm error, falling back to rules: %v", err)
		}
	}
	if reply == "" {
		reply, _ = chat.Rules{K: kb}.Reply(ctx, system, hist)
		provider = "rules"
	}

	// Transcript (best effort).
	page := in.Page
	if len(page) > 200 {
		page = page[:200]
	}
	last := hist[len(hist)-1]
	if _, err := s.DB.Exec(`INSERT INTO chat_messages (session_id, role, content, page, ip) VALUES (?,?,?,?,?), (?,?,?,?,?)`,
		in.SessionID, "user", last.Content, page, ip,
		in.SessionID, "assistant", reply, page, ""); err != nil {
		log.Printf("chat: store transcript: %v", err)
	}

	writeJSON(w, http.StatusOK, map[string]any{"reply": reply, "provider": provider})
}

// GET /api/admin/chats — recent sessions with their messages.
func (s *Server) adminListChats(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT session_id, role, content, page, created_at FROM chat_messages
		WHERE session_id IN (SELECT session_id FROM chat_messages GROUP BY session_id ORDER BY MAX(id) DESC LIMIT 100)
		ORDER BY id`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	type msg struct {
		Role      string `json:"role"`
		Content   string `json:"content"`
		CreatedAt string `json:"createdAt"`
	}
	type session struct {
		SessionID string `json:"sessionId"`
		Page      string `json:"page"`
		StartedAt string `json:"startedAt"`
		Messages  []msg  `json:"messages"`
	}
	order := []string{}
	byID := map[string]*session{}
	for rows.Next() {
		var sid, role, content, page, at string
		if err := rows.Scan(&sid, &role, &content, &page, &at); err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		sess, ok := byID[sid]
		if !ok {
			sess = &session{SessionID: sid, Page: page, StartedAt: at}
			byID[sid] = sess
			order = append(order, sid)
		}
		sess.Messages = append(sess.Messages, msg{role, content, at})
	}
	out := make([]*session, 0, len(order))
	for i := len(order) - 1; i >= 0; i-- { // newest first
		out = append(out, byID[order[i]])
	}
	writeJSON(w, http.StatusOK, out)
}
