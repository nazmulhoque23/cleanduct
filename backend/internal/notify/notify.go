// Package notify sends the business owner an alert when a lead arrives.
// The default implementation just logs; configure SMTP_* to email.
package notify

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"

	"ductcleaning/internal/models"
)

type Notifier interface {
	NewLead(lead models.Lead) error
}

// LogNotifier prints leads to stdout. Good for development.
type LogNotifier struct{}

func (LogNotifier) NewLead(l models.Lead) error {
	log.Printf("NEW LEAD #%d: %s <%s> %s | service=%q zip=%s pref=%s", l.ID, l.FullName, l.Email, l.Phone, l.Service, l.ZipCode, l.ContactPref)
	return nil
}

// SMTPNotifier emails each lead to the owner.
type SMTPNotifier struct {
	Host, User, Pass, From, To string
	Port                       int
}

func (n SMTPNotifier) NewLead(l models.Lead) error {
	subject := fmt.Sprintf("New quote request from %s (%s)", l.FullName, l.Service)
	body := strings.Join([]string{
		"A new quote request was submitted on the website.",
		"",
		"Name:     " + l.FullName,
		"Phone:    " + l.Phone,
		"Email:    " + l.Email,
		"Zip:      " + l.ZipCode,
		"Service:  " + l.Service,
		"Contact:  " + l.ContactPref,
		"Page:     " + l.SourcePage,
		"",
		"Message:",
		l.Message,
	}, "\r\n")

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s",
		n.From, n.To, subject, body)

	addr := fmt.Sprintf("%s:%d", n.Host, n.Port)
	var auth smtp.Auth
	if n.User != "" {
		auth = smtp.PlainAuth("", n.User, n.Pass, n.Host)
	}
	if err := smtp.SendMail(addr, auth, n.From, []string{n.To}, []byte(msg)); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	return nil
}
