// Package notify alerts the business owner (and confirms to the customer)
// when a lead or booking arrives.
//
// Channels are optional and env-driven:
//   - RESEND_API_KEY            → email via Resend's HTTP API (simplest)
//   - SMTP_HOST/PORT/USER/PASS  → email via SMTP
//   - TWILIO_SID/TOKEN/FROM/TO  → SMS to the owner via Twilio
//
// If nothing is configured, events are logged.
package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"net/url"
	"strings"
	"time"

	"ductcleaning/internal/models"
)

// Notifier receives business events. Implementations must be safe to call
// from a goroutine; errors are logged by the caller.
type Notifier interface {
	NewLead(lead models.Lead) error
	NewBooking(b models.Booking) error
	// BookingUpdate tells the customer about an owner decision:
	// kind = confirmed | declined | rescheduled; note is the owner's message/reason.
	BookingUpdate(b models.Booking, kind, note string) error
}

// ---- Emailer abstraction ---------------------------------------------------

type Emailer interface {
	Send(to, subject, text string) error
}

// ResendEmailer uses https://resend.com (HTTP API, no SMTP config).
type ResendEmailer struct {
	APIKey, From string
	Client       *http.Client
}

func (r ResendEmailer) Send(to, subject, text string) error {
	body, _ := json.Marshal(map[string]any{
		"from": r.From, "to": []string{to}, "subject": subject, "text": text,
	})
	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+r.APIKey)
	req.Header.Set("Content-Type", "application/json")
	c := r.Client
	if c == nil {
		c = &http.Client{Timeout: 10 * time.Second}
	}
	res, err := c.Do(req)
	if err != nil {
		return fmt.Errorf("resend: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("resend: status %d", res.StatusCode)
	}
	return nil
}

// SMTPEmailer uses a plain SMTP relay.
type SMTPEmailer struct {
	Host, User, Pass, From string
	Port                   int
}

func (n SMTPEmailer) Send(to, subject, text string) error {
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s", n.From, to, subject, text)
	addr := fmt.Sprintf("%s:%d", n.Host, n.Port)
	var auth smtp.Auth
	if n.User != "" {
		auth = smtp.PlainAuth("", n.User, n.Pass, n.Host)
	}
	if err := smtp.SendMail(addr, auth, n.From, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	return nil
}

// ---- SMS via Twilio ----------------------------------------------------------

type TwilioSMS struct {
	SID, Token, From, To string
	Client               *http.Client
}

func (t TwilioSMS) Send(text string) error {
	form := url.Values{"From": {t.From}, "To": {t.To}, "Body": {text}}
	endpoint := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", t.SID)
	req, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.SetBasicAuth(t.SID, t.Token)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	c := t.Client
	if c == nil {
		c = &http.Client{Timeout: 10 * time.Second}
	}
	res, err := c.Do(req)
	if err != nil {
		return fmt.Errorf("twilio: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("twilio: status %d", res.StatusCode)
	}
	return nil
}

// ---- Composite notifier --------------------------------------------------------

// Multi fans events out to whatever channels are configured. Nil fields are
// skipped, so it also serves as the log-only notifier.
type Multi struct {
	Email    Emailer // nil = no email
	SMS      *TwilioSMS
	OwnerTo  string // owner inbox
	SiteName string
	Phone    string // business phone shown in customer confirmations
}

func (m Multi) NewLead(l models.Lead) error {
	log.Printf("NEW LEAD #%d: %s <%s> %s | service=%q zip=%s pref=%s", l.ID, l.FullName, l.Email, l.Phone, l.Service, l.ZipCode, l.ContactPref)

	ownerText := strings.Join([]string{
		"A new quote request was submitted on the website.",
		"",
		"Name:     " + l.FullName,
		"Phone:    " + l.Phone,
		"Email:    " + l.Email,
		"Zip:      " + l.ZipCode,
		"Service:  " + l.Service,
		"Contact:  " + l.ContactPref + boolNote(l.SmsConsent, " (OK to text)"),
		"Page:     " + l.SourcePage,
		"",
		"Message:",
		l.Message,
	}, "\n")
	customerText := fmt.Sprintf(
		"Hi %s,\n\nThanks for requesting a quote from %s. We received your request for %s and will reach out by %s within one business hour during open hours.\n\nNeed us sooner? Call or text %s.\n\n— The %s team",
		firstName(l.FullName), m.SiteName, orDefault(l.Service, "duct cleaning"), l.ContactPref, m.Phone, m.SiteName)

	return m.fanOut(
		fmt.Sprintf("New quote request: %s (%s)", l.FullName, orDefault(l.Service, "unspecified")), ownerText,
		l.Email, "We got your quote request", customerText,
		fmt.Sprintf("%s lead: %s %s — %s", m.SiteName, l.FullName, l.Phone, orDefault(l.Service, "unspecified")),
	)
}

func (m Multi) NewBooking(b models.Booking) error {
	log.Printf("NEW BOOKING #%d: %s %s on %s %s | service=%q", b.ID, b.FullName, b.Phone, b.SlotDate, b.SlotWindow, b.Service)

	ownerText := strings.Join([]string{
		"A new online booking request came in.",
		"",
		"When:     " + b.SlotDate + " " + b.SlotWindow,
		"Service:  " + b.Service,
		"Name:     " + b.FullName,
		"Phone:    " + b.Phone + boolNote(b.SmsConsent, " (OK to text)"),
		"Email:    " + b.Email,
		"Address:  " + b.Address + " " + b.ZipCode,
		"",
		"Notes:",
		b.Notes,
		"",
		"Confirm it in the admin panel.",
	}, "\n")
	customerText := fmt.Sprintf(
		"Hi %s,\n\nYour %s appointment is requested for %s, %s arrival window.\n\nWe'll confirm by phone or text shortly. If anything changes, call or text %s.\n\nAddress on file: %s %s\n\n— The %s team",
		firstName(b.FullName), b.Service, prettyDate(b.SlotDate), b.SlotWindow, m.Phone, b.Address, b.ZipCode, m.SiteName)

	return m.fanOut(
		fmt.Sprintf("Booking request: %s %s — %s", b.SlotDate, b.SlotWindow, b.FullName), ownerText,
		b.Email, "Your appointment request with "+m.SiteName, customerText,
		fmt.Sprintf("%s booking: %s %s — %s %s", m.SiteName, b.SlotDate, b.SlotWindow, b.FullName, b.Phone),
	)
}

func (m Multi) BookingUpdate(b models.Booking, kind, note string) error {
	log.Printf("BOOKING #%d %s: %s %s %s", b.ID, kind, b.FullName, b.SlotDate, b.SlotWindow)
	var subject, text string
	when := prettyDate(b.SlotDate) + ", " + b.SlotWindow
	price := ""
	if b.QuotedPrice != nil {
		price = fmt.Sprintf("\nQuoted price: $%d (payable after the job; add-ons only with your approval)", *b.QuotedPrice)
	}
	extra := ""
	if strings.TrimSpace(note) != "" {
		extra = "\n\nNote from our team: " + note
	}
	switch kind {
	case "confirmed":
		subject = "Confirmed: your " + b.Service + " appointment"
		text = fmt.Sprintf("Hi %s,\n\nYou're booked! %s for %s at %s %s.%s%s\n\nWe'll call about 30 minutes before arrival. Need to change it? Call or text %s.\n\n— The %s team",
			firstName(b.FullName), b.Service, when, b.Address, b.ZipCode, price, extra, m.Phone, m.SiteName)
	case "declined":
		subject = "About your " + b.Service + " request"
		text = fmt.Sprintf("Hi %s,\n\nUnfortunately we can't take the %s slot you requested for %s.%s\n\nPlease pick another time at /book or call %s and we'll find one that works.\n\n— The %s team",
			firstName(b.FullName), when, b.Service, extra, m.Phone, m.SiteName)
	case "rescheduled":
		subject = "Updated: your " + b.Service + " appointment"
		text = fmt.Sprintf("Hi %s,\n\nYour %s appointment has been moved to %s.%s%s\n\nIf that doesn't work, call or text %s.\n\n— The %s team",
			firstName(b.FullName), b.Service, when, price, extra, m.Phone, m.SiteName)
	default:
		return nil
	}
	if m.Email == nil || b.Email == "" {
		return nil
	}
	return m.Email.Send(b.Email, subject, text)
}

func (m Multi) fanOut(ownerSubject, ownerText, customerTo, customerSubject, customerText, sms string) error {
	var errs []string
	if m.Email != nil {
		if m.OwnerTo != "" {
			if err := m.Email.Send(m.OwnerTo, ownerSubject, ownerText); err != nil {
				errs = append(errs, err.Error())
			}
		}
		if customerTo != "" {
			if err := m.Email.Send(customerTo, customerSubject, customerText); err != nil {
				errs = append(errs, err.Error())
			}
		}
	}
	if m.SMS != nil {
		if err := m.SMS.Send(sms); err != nil {
			errs = append(errs, err.Error())
		}
	}
	if len(errs) > 0 {
		return fmt.Errorf("notify: %s", strings.Join(errs, "; "))
	}
	return nil
}

func boolNote(b bool, note string) string {
	if b {
		return note
	}
	return ""
}

func orDefault(s, def string) string {
	if strings.TrimSpace(s) == "" {
		return def
	}
	return s
}

func firstName(full string) string {
	if i := strings.IndexByte(strings.TrimSpace(full), ' '); i > 0 {
		return full[:i]
	}
	return full
}

func prettyDate(ymd string) string {
	if t, err := time.Parse("2006-01-02", ymd); err == nil {
		return t.Format("Monday, January 2")
	}
	return ymd
}
