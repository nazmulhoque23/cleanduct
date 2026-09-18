# CleanDuct — Email & SMS Notifications

How the site tells the owner about new leads and bookings, and confirms to the customer.
Code: `backend/internal/notify/notify.go`, wired in `backend/cmd/server/main.go`.

---

## 1. What is sent, and when

| Trigger | To the owner (`NOTIFY_TO`) | To the customer | SMS to owner (optional) |
|---|---|---|---|
| Quote form submitted (`POST /api/leads`) | "New quote request: {name} ({service})" — name, phone, email, ZIP, service, contact preference (+ "OK to text" if consented), page it came from, message | "We got your quote request" — thanks, what they asked for, promise to reach out within one business hour by their preferred method, phone number | "CleanDuct lead: {name} {phone} — {service}" |
| Online booking (`POST /api/bookings`) | "Booking request: {date} {window} — {name}" — when, service, name, phone, email, address, notes, reminder to confirm in admin | "Your appointment request with CleanDuct" — requested date (spelled out), arrival window, "we'll confirm by phone or text", address on file, phone number | "CleanDuct booking: {date} {window} — {name} {phone}" |

All messages are **plain text** on purpose: they render everywhere, land in the inbox more reliably than
HTML marketing-style mail, and are easy to edit in one Go file.

Sends run **asynchronously** (`go func()` after the DB insert) so a slow mail server never delays the form
response. Failures are logged (`notify lead #N: …`) and never shown to the customer. The lead/booking is
always saved in SQLite first, so nothing is lost if email is down — it is still visible in `/admin`.

### Owner decisions (admin panel)

When the owner acts on a booking in **Admin › Bookings**, the customer gets one more email
(`notify.Multi.BookingUpdate`):

| Action | Subject | Contents |
|---|---|---|
| Accept | *Your appointment is confirmed* | date, arrival window, service, quoted price (if entered), owner's message |
| Decline | *About your booking request* | the reason the owner typed, and a nudge to rebook or call |
| Reschedule | *Your appointment has a new time* | the new date/window, and the owner's message |

"Price & note" edits and "Mark done" send nothing. SMS is not used for these (email only).

## 2. Providers (pick ONE for email)

### Option A — Resend (recommended)

HTTP API, no SMTP ports, no TLS setup, generous free tier.

1. Create an account at resend.com, add your domain and publish the DNS records it gives you (SPF/DKIM).
2. Create an API key.
3. Set:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
NOTIFY_FROM=leads@cleanduct.com      # an address on the verified domain
NOTIFY_TO=owner@example.com          # where alerts go
```

### Option B — SMTP

Works with Gmail (use an App Password), Zoho, Outlook, or your web host's mail server.

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx        # Gmail app password, not your login password
NOTIFY_FROM=you@gmail.com
NOTIFY_TO=you@gmail.com
```

Uses `net/smtp` with PLAIN auth over STARTTLS on port 587. If `SMTP_USER` is empty, no auth is attempted
(for a local relay).

If both are set, **Resend wins**. If neither is set the server logs
`notify: no email provider configured; leads/bookings will be logged only` and prints each lead to the
console instead.

### Optional — SMS via Twilio

```bash
TWILIO_SID=ACxxxxxxxx
TWILIO_TOKEN=xxxxxxxx
TWILIO_FROM=+15551234567             # your Twilio number
TWILIO_TO=+15557654321               # the owner's mobile
```

All four must be set; then every lead and booking also texts the owner.

## 3. Where to put the variables

- **Local dev:** create `backend/.env` (copy `.env.example`) and export it before `go run`:
  `set -a; source .env; set +a; go run ./cmd/server`
- **Docker:** add them under `environment:` in `docker-compose.yml` (or an `env_file:`).
- **systemd:** `Environment=` lines or `EnvironmentFile=`.

On startup the log tells you what is active, e.g. `notify: email via Resend -> owner@example.com` or
`notify: SMS via Twilio -> +1555…`.

## 4. Testing it

1. Start the server with the variables set.
2. Submit the quote form on the site (or `curl -X POST localhost:8080/api/leads -H 'Content-Type: application/json' -d '{"fullName":"Test","email":"you@example.com","phone":"3125550100"}'`).
3. Two emails should arrive within seconds: one to `NOTIFY_TO`, one to the customer address you used.
4. If nothing arrives, check the server log for `notify lead #…: resend: status 4xx` (bad key / unverified
   sender) or `smtp send: …` (auth or port issue).

## 5. Consent & compliance notes

- Both forms have an SMS-consent checkbox with TCPA-style wording ("Msg & data rates may apply. Reply STOP
  to opt out."). Choosing **text** as the preferred contact method requires the box to be ticked; the flag is
  stored (`sms_consent`) and shown in the admin as "OK to text".
- The customer confirmation is transactional (a reply to their own request), so it does not need marketing
  consent. Do not reuse the addresses for newsletters without separate opt-in.
- `NOTIFY_FROM` must be a sender the provider has verified, or mail will be rejected or land in spam.

## 6. Customising the messages

Edit the text in `Multi.NewLead` / `Multi.NewBooking` in `notify.go`. Both build the owner text, the
customer text and the SMS text in one place. To add a channel (Slack webhook, another SMS vendor),
implement `Emailer` (`Send(to, subject, text)`) or add a field to `Multi` and call it from `fanOut`.

## 7. Not implemented (by choice)

- HTML templates / branded email design.
- A retry queue — a failed send is logged once and dropped (the record itself is safe in the DB).
- Reply-to threading, attachments, or reading incoming mail.
