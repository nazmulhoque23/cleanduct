# Admin panel — owner's guide

The admin panel lives at **`/admin`** on the website. Sign in with the `ADMIN_TOKEN` value the server was started with (set it in `backend/.env`). The token is kept in the browser tab's session storage, so closing the tab signs you out.

Everything below works without any third-party service. Emails to customers are sent only if an email provider is configured (see `docs/email-notifications.md`); otherwise the action still happens and the email is logged to the server console.

## Sections

| Section | What it's for |
|---|---|
| **Dashboard** | Numbers at a glance (pending bookings, new quote requests, jobs today / next 7 days, completed and quoted this month, chat sessions today). "Next jobs" lists upcoming bookings with pending ones first and a **Review** button; "Call back" lists new quote requests with a tap-to-call phone number. |
| **Bookings** | Every online booking (order). Filter by Pending / Accepted / Completed / Declined. Each card has the customer's details, the requested date and arrival window, their notes, and the quoted price. Actions: **Accept**, **Decline**, **Reschedule**, **Price & note**, **Mark done**. |
| **Schedule** | The next 21 days with the jobs in each day, open slot counts, Sundays marked closed, and a **Block a date** form for holidays/vacation. Blocked dates disappear from the customer's booking calendar immediately. |
| **Quote requests** | Leads from the quote form on the site. Mark each one new → contacted → booked → closed. |
| **Chats** | Transcripts of chatbot conversations — a good place to spot questions you should add as FAQs. |
| **Services / Service areas / Promotions / Reviews / FAQs / Blog posts** | Edit the site's content. Changes are live as soon as you save. |
| **Settings** | Business name, phone, email, address, hours, rating badge, social links, and the online-booking rules (arrival windows, jobs per window, how far ahead customers can book, minimum notice). |

## Handling an order (booking)

A customer books on `/book`. You get an owner alert email/SMS (if configured), the customer gets a "request received" email, and the booking appears as **Pending**.

1. **Accept** — optionally enter a **quoted price** (whole dollars) and a short **message to customer**. The booking becomes *Accepted* and the customer receives a confirmation email with the date, arrival window, price and your message.
2. **Decline** — enter a reason (sent to the customer). The slot is freed for other customers and the booking becomes *Declined*.
3. **Reschedule** — pick a new date and arrival window; windows that are already full are marked. The customer is emailed the new time. Rescheduling a declined booking re-opens it as *Pending*.
4. **Price & note** — change the quoted price or the note without emailing anyone. The note is included the next time you accept or reschedule.
5. **Mark done** — once the job is finished. Completed jobs count toward "Completed this month" and "Quoted this month".

Only *Accepted* and *Pending* bookings occupy capacity; declined and completed ones don't block the calendar.

## Price scheduling

Two levers:

* **Per job:** the quoted price on each booking (Accept or Price & note). It shows on the dashboard, the schedule and in customer emails.
* **Per service:** the "Starting price ($)" on each service (Services section) is what the website and the chatbot advertise. Promotions (with an optional expiry date) appear on the site and in chatbot answers about deals.

## FAQs → chatbot

The chatbot answers **only** from the site's own content, with no AI service required. FAQs are its main source:

* **Question / Answer** — the answer is sent word-for-word, so keep it short and friendly.
* **Chatbot trigger words** — comma-separated words a visitor might type ("price, cost, how much"). A message containing any of them gets this FAQ's answer. Without trigger words the bot still matches when two or more words of the question overlap the visitor's message.
* **Show on the website FAQ list** — untick to make a question chatbot-only (useful for very specific questions you don't want on the public page).

Check **Chats** now and then: if visitors keep asking something the bot redirects ("I can only help with…"), add it as an FAQ with good trigger words and the bot will answer it from then on. See `docs/chatbot.md` for the matching rules.

## Settings

The environment file (`backend/.env`) provides defaults; anything you save in Settings overrides it and applies immediately (header, footer, call buttons, emails, Google structured data, booking rules). Clearing a field reverts to the `.env` value.

* **Arrival windows** — `08:00-10:00|10:00-12:00|…` (24-hour, separated by `|`).
* **Jobs per window** — how many bookings you accept per window per day (roughly, the number of crews).
* **Days bookable ahead / Minimum notice** — how far into the future customers may book and how much notice you need (0 allows same-day).

## Under the hood

* Routes (all need `Authorization: Bearer <ADMIN_TOKEN>`): `GET /api/admin/dashboard`, `GET /api/admin/bookings[?from=YYYY-MM-DD]`, `POST /api/admin/bookings/{id}/accept|reject|reschedule`, `PATCH /api/admin/bookings/{id}/details`, `PATCH /api/admin/bookings/{id}` (status only), `GET|PUT /api/admin/settings`, `GET|POST /api/admin/blocked-dates`, `DELETE /api/admin/blocked-dates/{date}`, plus the content CRUD at `/api/admin/content/{resource}`.
* Storage: migration `005_admin_ops.sql` adds `quoted_price`, `admin_note`, `decline_reason`, `updated_at` to `bookings`, `admin_note` to `leads`, and the `settings` and `blocked_dates` tables. It runs automatically on start — no need to delete `site.db`.
* Code: `backend/internal/handlers/{bookings,settings,dashboard}.go`, customer emails in `backend/internal/notify/notify.go` (`BookingUpdate`), UI in `frontend/src/pages/admin/`.
