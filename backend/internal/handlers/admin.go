package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

// Generic admin CRUD for the content tables. Each resource declares the
// columns the admin may read/write; everything else is rejected. Rows are
// returned as plain JSON objects keyed by column name (camelCase), which
// lets the React admin render an editor from a schema instead of one page
// per table.

type column struct {
	Name     string // SQL column
	JSON     string // JSON key
	Kind     string // text | int | bool | date
	Required bool
}

type resource struct {
	Table   string
	Order   string
	Columns []column
}

var resources = map[string]resource{
	"services": {Table: "services", Order: "sort_order, name", Columns: []column{
		{"slug", "slug", "text", true}, {"name", "name", "text", true}, {"short_desc", "shortDesc", "text", true},
		{"long_desc", "longDesc", "text", true}, {"icon", "icon", "text", false}, {"category", "category", "text", true},
		{"starting_at", "startingAt", "int", false}, {"featured", "featured", "bool", false}, {"sort_order", "sortOrder", "int", false},
	}},
	"service-areas": {Table: "service_areas", Order: "featured DESC, city", Columns: []column{
		{"slug", "slug", "text", true}, {"city", "city", "text", true}, {"state", "state", "text", true},
		{"zip_codes", "zipCodes", "text", false}, {"blurb", "blurb", "text", false}, {"featured", "featured", "bool", false},
		{"intro", "intro", "text", false}, {"neighborhoods", "neighborhoods", "text", false},
	}},
	"testimonials": {Table: "testimonials", Order: "reviewed_at DESC", Columns: []column{
		{"author", "author", "text", true}, {"location", "location", "text", false}, {"rating", "rating", "int", true},
		{"quote", "quote", "text", true}, {"service", "service", "text", false}, {"source", "source", "text", false},
		{"reviewed_at", "reviewedAt", "date", true}, {"published", "published", "bool", false},
	}},
	"faqs": {Table: "faqs", Order: "sort_order", Columns: []column{
		{"question", "question", "text", true}, {"answer", "answer", "text", true}, {"sort_order", "sortOrder", "int", false},
		{"keywords", "keywords", "text", false}, {"show_on_site", "showOnSite", "bool", false},
	}},
	"promotions": {Table: "promotions", Order: "id", Columns: []column{
		{"title", "title", "text", true}, {"description", "description", "text", true}, {"badge", "badge", "text", false},
		{"code", "code", "text", false}, {"expires_at", "expiresAt", "date", false}, {"active", "active", "bool", false},
	}},
	"posts": {Table: "posts", Order: "published_at DESC", Columns: []column{
		{"slug", "slug", "text", true}, {"title", "title", "text", true}, {"excerpt", "excerpt", "text", true},
		{"body", "body", "text", true}, {"category", "category", "text", false}, {"read_minutes", "readMinutes", "int", false},
		{"published_at", "publishedAt", "date", true}, {"published", "published", "bool", false},
	}},
}

// GET /api/admin/schema — lets the admin UI build forms.
func (s *Server) adminSchema(w http.ResponseWriter, r *http.Request) {
	out := map[string]any{}
	for name, res := range resources {
		cols := make([]map[string]any, 0, len(res.Columns))
		for _, c := range res.Columns {
			cols = append(cols, map[string]any{"key": c.JSON, "kind": c.Kind, "required": c.Required})
		}
		out[name] = cols
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) adminListResource(w http.ResponseWriter, r *http.Request) {
	res, ok := resources[chi.URLParam(r, "resource")]
	if !ok {
		writeError(w, http.StatusNotFound, "unknown resource")
		return
	}
	rows, err := s.DB.Query(fmt.Sprintf(`SELECT id, %s FROM %s ORDER BY %s`, selectList(res), res.Table, res.Order))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		row, err := scanRow(rows, res)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "scan failed")
			return
		}
		out = append(out, row)
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) adminCreateResource(w http.ResponseWriter, r *http.Request) {
	res, ok := resources[chi.URLParam(r, "resource")]
	if !ok {
		writeError(w, http.StatusNotFound, "unknown resource")
		return
	}
	in, errs := decodeResource(w, r, res, true)
	if len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "validation failed", "fields": errs})
		return
	}
	cols, marks, vals := make([]string, 0), make([]string, 0), make([]any, 0)
	for _, c := range res.Columns {
		if v, ok := in[c.Name]; ok {
			cols = append(cols, c.Name)
			marks = append(marks, "?")
			vals = append(vals, v)
		}
	}
	q := fmt.Sprintf(`INSERT INTO %s (%s) VALUES (%s)`, res.Table, strings.Join(cols, ","), strings.Join(marks, ","))
	result, err := s.DB.Exec(q, vals...)
	if err != nil {
		writeError(w, http.StatusBadRequest, "insert failed: "+sqlErr(err))
		return
	}
	id, _ := result.LastInsertId()
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true, "id": id})
}

func (s *Server) adminUpdateResource(w http.ResponseWriter, r *http.Request) {
	res, ok := resources[chi.URLParam(r, "resource")]
	if !ok {
		writeError(w, http.StatusNotFound, "unknown resource")
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	in, errs := decodeResource(w, r, res, false)
	if len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "validation failed", "fields": errs})
		return
	}
	if len(in) == 0 {
		writeError(w, http.StatusBadRequest, "nothing to update")
		return
	}
	sets, vals := make([]string, 0), make([]any, 0)
	for _, c := range res.Columns {
		if v, ok := in[c.Name]; ok {
			sets = append(sets, c.Name+" = ?")
			vals = append(vals, v)
		}
	}
	vals = append(vals, id)
	result, err := s.DB.Exec(fmt.Sprintf(`UPDATE %s SET %s WHERE id = ?`, res.Table, strings.Join(sets, ", ")), vals...)
	if err != nil {
		writeError(w, http.StatusBadRequest, "update failed: "+sqlErr(err))
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) adminDeleteResource(w http.ResponseWriter, r *http.Request) {
	res, ok := resources[chi.URLParam(r, "resource")]
	if !ok {
		writeError(w, http.StatusNotFound, "unknown resource")
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	result, err := s.DB.Exec(fmt.Sprintf(`DELETE FROM %s WHERE id = ?`, res.Table), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ---- helpers ------------------------------------------------------------------

func selectList(res resource) string {
	names := make([]string, len(res.Columns))
	for i, c := range res.Columns {
		names[i] = c.Name
	}
	return strings.Join(names, ", ")
}

func scanRow(rows *sql.Rows, res resource) (map[string]any, error) {
	var id int64
	dest := make([]any, 0, len(res.Columns)+1)
	dest = append(dest, &id)
	holders := make([]sql.NullString, len(res.Columns))
	for i := range res.Columns {
		dest = append(dest, &holders[i])
	}
	if err := rows.Scan(dest...); err != nil {
		return nil, err
	}
	row := map[string]any{"id": id}
	for i, c := range res.Columns {
		h := holders[i]
		if !h.Valid {
			row[c.JSON] = nil
			continue
		}
		switch c.Kind {
		case "int":
			n, _ := strconv.ParseInt(h.String, 10, 64)
			row[c.JSON] = n
		case "bool":
			row[c.JSON] = h.String == "1"
		default:
			row[c.JSON] = h.String
		}
	}
	return row, nil
}

// decodeResource validates the JSON body against the resource's columns and
// returns SQL column → value. On create, required columns must be present.
func decodeResource(w http.ResponseWriter, r *http.Request, res resource, create bool) (map[string]any, map[string]string) {
	r.Body = http.MaxBytesReader(w, r.Body, 256<<10)
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return nil, map[string]string{"_": "invalid JSON body"}
	}
	out := map[string]any{}
	errs := map[string]string{}
	for _, c := range res.Columns {
		v, present := body[c.JSON]
		if !present {
			if create && c.Required {
				errs[c.JSON] = "required"
			}
			continue
		}
		switch c.Kind {
		case "text", "date":
			str, ok := v.(string)
			if !ok && v != nil {
				errs[c.JSON] = "must be text"
				continue
			}
			str = strings.TrimSpace(str)
			if c.Required && str == "" {
				errs[c.JSON] = "required"
				continue
			}
			if c.Kind == "date" && str == "" {
				out[c.Name] = nil // nullable date (e.g. promotion with no expiry)
			} else {
				out[c.Name] = str
			}
		case "int":
			switch n := v.(type) {
			case nil:
				out[c.Name] = nil
			case float64:
				out[c.Name] = int64(n)
			case string:
				if strings.TrimSpace(n) == "" {
					out[c.Name] = nil
				} else if i, err := strconv.ParseInt(n, 10, 64); err == nil {
					out[c.Name] = i
				} else {
					errs[c.JSON] = "must be a number"
				}
			default:
				errs[c.JSON] = "must be a number"
			}
		case "bool":
			b, ok := v.(bool)
			if !ok {
				errs[c.JSON] = "must be true/false"
				continue
			}
			out[c.Name] = boolInt(b)
		}
	}
	return out, errs
}

func sqlErr(err error) string {
	msg := err.Error()
	if strings.Contains(msg, "UNIQUE") {
		return "a record with that slug already exists"
	}
	return "invalid data"
}
