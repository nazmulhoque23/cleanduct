// Command server runs the duct cleaning site API (and, in production,
// serves the built React frontend).
//
//	go run ./cmd/server
//
// Configuration is via environment variables; see .env.example.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ductcleaning/internal/config"
	"ductcleaning/internal/db"
	"ductcleaning/internal/handlers"
	"ductcleaning/internal/notify"
)

func main() {
	cfg := config.Load()

	conn, err := db.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer conn.Close()

	if err := db.Migrate(conn); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if err := db.Seed(conn); err != nil {
		log.Fatalf("seed: %v", err)
	}

	notifier := notify.Multi{OwnerTo: cfg.NotifyTo, SiteName: cfg.Site.Name, Phone: cfg.Site.Phone}
	switch {
	case cfg.ResendAPIKey != "":
		notifier.Email = notify.ResendEmailer{APIKey: cfg.ResendAPIKey, From: cfg.NotifyFrom}
		log.Printf("notify: email via Resend -> %s", cfg.NotifyTo)
	case cfg.SMTPHost != "":
		notifier.Email = notify.SMTPEmailer{Host: cfg.SMTPHost, Port: cfg.SMTPPort, User: cfg.SMTPUser, Pass: cfg.SMTPPass, From: cfg.NotifyFrom}
		log.Printf("notify: email via SMTP %s -> %s", cfg.SMTPHost, cfg.NotifyTo)
	default:
		log.Println("notify: no email provider configured; leads/bookings will be logged only")
	}
	if cfg.TwilioSID != "" && cfg.TwilioToken != "" && cfg.TwilioFrom != "" && cfg.TwilioTo != "" {
		notifier.SMS = &notify.TwilioSMS{SID: cfg.TwilioSID, Token: cfg.TwilioToken, From: cfg.TwilioFrom, To: cfg.TwilioTo}
		log.Printf("notify: SMS via Twilio -> %s", cfg.TwilioTo)
	}

	srv := handlers.New(conn, cfg, notifier)
	httpSrv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Router(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("listening on %s (static=%q)", cfg.Addr, cfg.StaticDir)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	// Graceful shutdown on Ctrl-C / SIGTERM (Docker stop).
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Println("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpSrv.Shutdown(ctx)
}
