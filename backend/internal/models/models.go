// Package models defines the JSON shapes returned by the API.
package models

type Service struct {
	ID         int64  `json:"id"`
	Slug       string `json:"slug"`
	Name       string `json:"name"`
	ShortDesc  string `json:"shortDesc"`
	LongDesc   string `json:"longDesc"`
	Icon       string `json:"icon"`
	Category   string `json:"category"`
	StartingAt *int64 `json:"startingAt"` // nil = "call for quote"
	Featured   bool   `json:"featured"`
}

type ServiceArea struct {
	ID       int64  `json:"id"`
	Slug     string `json:"slug"`
	City     string `json:"city"`
	State    string `json:"state"`
	ZipCodes string `json:"zipCodes"`
	Blurb    string `json:"blurb"`
	Featured bool   `json:"featured"`
}

type Testimonial struct {
	ID         int64  `json:"id"`
	Author     string `json:"author"`
	Location   string `json:"location"`
	Rating     int    `json:"rating"`
	Quote      string `json:"quote"`
	Service    string `json:"service"`
	Source     string `json:"source"`
	ReviewedAt string `json:"reviewedAt"`
}

type FAQ struct {
	ID       int64  `json:"id"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type Promotion struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Badge       string  `json:"badge"`
	Code        string  `json:"code"`
	ExpiresAt   *string `json:"expiresAt"`
}

type Post struct {
	ID          int64  `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Excerpt     string `json:"excerpt"`
	Body        string `json:"body,omitempty"`
	Category    string `json:"category"`
	ReadMinutes int    `json:"readMinutes"`
	PublishedAt string `json:"publishedAt"`
}

// LeadInput is what the public quote form posts.
type LeadInput struct {
	FullName    string `json:"fullName"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	ZipCode     string `json:"zipCode"`
	Service     string `json:"service"`
	ContactPref string `json:"contactPref"`
	Message     string `json:"message"`
	SourcePage  string `json:"sourcePage"`
	// Honeypot: real users never fill this. Bots do.
	Website string `json:"website"`
}

type Lead struct {
	ID          int64  `json:"id"`
	FullName    string `json:"fullName"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	ZipCode     string `json:"zipCode"`
	Service     string `json:"service"`
	ContactPref string `json:"contactPref"`
	Message     string `json:"message"`
	SourcePage  string `json:"sourcePage"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
}

// SiteInfo is static business info the frontend renders in header/footer.
// Kept server-side so a single .env change updates the whole site.
type SiteInfo struct {
	Name        string   `json:"name"`
	Tagline     string   `json:"tagline"`
	Phone       string   `json:"phone"`
	PhoneHref   string   `json:"phoneHref"`
	Email       string   `json:"email"`
	Address     string   `json:"address"`
	Hours       []string `json:"hours"`
	Rating      float64  `json:"rating"`
	ReviewCount int      `json:"reviewCount"`
	YearFounded int      `json:"yearFounded"`
	Social      struct {
		Facebook  string `json:"facebook"`
		Instagram string `json:"instagram"`
		YouTube   string `json:"youtube"`
		Google    string `json:"google"`
	} `json:"social"`
}
