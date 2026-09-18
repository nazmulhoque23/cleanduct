import { useState, type FormEvent, type ReactNode } from 'react'
import { api, ApiError, type BookingInput } from '../lib/api'
import { useFetch, useSeo } from '../lib/hooks'
import { useSite } from '../lib/site-context'
import { track } from '../lib/analytics'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'

const SERVICES = [
  'Air Duct Cleaning',
  'Dryer Vent Cleaning',
  'Chimney Sweep & Fireplace Cleaning',
  'UV Light & Air Purification',
  'Duct Sanitizing & Odor Removal',
  'HVAC & Air Duct Inspection',
  'Duct + Dryer Vent Bundle',
]

const empty: BookingInput = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  zipCode: '',
  service: '',
  slotDate: '',
  slotWindow: '',
  notes: '',
  smsConsent: false,
  website: '',
}

function windowLabel(w: string) {
  const [a, b] = w.split('-')
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${ampm}`
  }
  return `${fmt(a)} – ${fmt(b)}`
}

export function Book() {
  const site = useSite()
  useSeo(`Book Online | ${site.name}`, 'Pick a date and arrival window for your cleaning. Same-week appointments available.')
  const { data: avail, loading } = useFetch(api.availability, 'availability')
  const [form, setForm] = useState<BookingInput>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [serverMsg, setServerMsg] = useState('')
  const [step, setStep] = useState<1 | 2>(1)

  const set = (k: keyof BookingInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const day = avail?.days.find((d) => d.date === form.slotDate)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrors({})
    try {
      await api.createBooking(form)
      track('booking_submit', { service: form.service, window: form.slotWindow })
      setStatus('success')
    } catch (err) {
      setStatus('error')
      if (err instanceof ApiError) {
        setErrors(err.fields ?? {})
        setServerMsg(err.fields ? 'Please fix the highlighted fields.' : err.message)
        if (err.fields?.slotWindow || err.fields?.slotDate) setStep(1)
      } else {
        setServerMsg('Something went wrong. Please call us instead.')
      }
    }
  }

  const field = (k: keyof BookingInput) =>
    `w-full rounded-xl border bg-tint/[0.04] px-3.5 py-2.5 text-[15px] text-fg placeholder:text-fg-muted/70 transition-all ` +
    (errors[k] ? 'border-red-400/70 focus:border-red-400' : 'border-line-strong hover:border-tint/25 focus:border-accent-400') +
    ' focus:bg-tint/[0.06] focus:outline-none focus:ring-4 focus:ring-accent-400/15'

  if (status === 'success') {
    return (
      <>
        <PageHeader eyebrow="Booking" title="You're on the calendar." />
        <Section>
          <div className="card mx-auto max-w-xl p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-400/15 text-accent-300 ring-1 ring-accent-400/40">
              <Icon name="check" size={28} />
            </div>
            <h2 className="mt-4 text-2xl font-bold">Request received</h2>
            <p className="mt-2 text-fg-soft">
              <strong className="text-fg">{day?.label}</strong>, arrival window <strong className="text-fg">{windowLabel(form.slotWindow)}</strong>.
            </p>
            <p className="mt-3 text-sm text-fg-muted">
              We'll confirm by phone or text shortly and email a confirmation to {form.email}. Need to change it? Call{' '}
              <a href={site.phoneHref} className="font-semibold text-accent-300">
                {site.phone}
              </a>
              .
            </p>
            <Button to="/" variant="ghost" className="mt-6">
              Back to home
            </Button>
          </div>
        </Section>
      </>
    )
  }

  return (
    <>
      <PageHeader eyebrow="Book online" title="Pick a time. We'll handle the rest." lead="Choose an arrival window, tell us about the job, and we'll confirm by phone or text. No payment required to book." />
      <Section>
        <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-12">
          {/* Step 1: schedule */}
          <div className="lg:col-span-7">
            <StepHeading n={1} title="Choose a date and arrival window" active={step === 1} done={!!form.slotWindow} />
            <div className={`card mt-4 p-5 sm:p-6 ${step !== 1 ? 'opacity-70' : ''}`}>
              {loading && <p className="text-sm text-fg-muted">Loading availability…</p>}
              {avail && (
                <>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fg-muted">Date</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
                    {avail.days.map((d) => {
                      const free = Object.values(d.windows).some((n) => n > 0)
                      const sel = form.slotDate === d.date
                      const [dow, rest] = d.label.split(', ')
                      return (
                        <button
                          type="button"
                          key={d.date}
                          disabled={!free}
                          onClick={() => {
                            setForm((f) => ({ ...f, slotDate: d.date, slotWindow: '' }))
                            setStep(1)
                          }}
                          className={`rounded-xl px-2 py-2.5 text-center ring-1 ring-inset transition-all disabled:opacity-30 ${
                            sel ? 'bg-accent-400 text-bg ring-accent-400 shadow-glow' : 'bg-tint/[0.04] text-fg-soft ring-line hover:text-fg hover:ring-line-strong'
                          }`}
                        >
                          <span className="block text-[11px] font-semibold uppercase tracking-wider">{dow}</span>
                          <span className="block font-display text-[15px] font-bold">{rest}</span>
                        </button>
                      )
                    })}
                  </div>
                  {errors.slotDate && <p className="mt-2 text-xs font-medium text-red-400">{errors.slotDate}</p>}

                  <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-fg-muted">Arrival window {day ? `· ${day.label}` : ''}</p>
                  <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-5">
                    {avail.windows.map((w) => {
                      const left = day?.windows[w] ?? 0
                      const disabled = !day || left <= 0
                      const sel = form.slotWindow === w
                      return (
                        <button
                          type="button"
                          key={w}
                          disabled={disabled}
                          onClick={() => {
                            setForm((f) => ({ ...f, slotWindow: w }))
                            setStep(2)
                          }}
                          className={`rounded-xl px-3 py-3 text-center ring-1 ring-inset transition-all disabled:opacity-30 ${
                            sel ? 'bg-accent-400 text-bg ring-accent-400 shadow-glow' : 'bg-tint/[0.04] text-fg-soft ring-line hover:text-fg hover:ring-line-strong'
                          }`}
                        >
                          <span className="block text-[13.5px] font-semibold">{windowLabel(w)}</span>
                          <span className={`block text-[11px] ${sel ? 'text-bg/70' : 'text-fg-muted'}`}>{!day ? 'pick a date' : left <= 0 ? 'full' : left === 1 ? '1 slot left' : 'available'}</span>
                        </button>
                      )
                    })}
                  </div>
                  {errors.slotWindow && <p className="mt-2 text-xs font-medium text-red-400">{errors.slotWindow}</p>}
                </>
              )}
            </div>

            <StepHeading n={2} title="Your details" active={step === 2} done={false} className="mt-10" />
            <div className={`card mt-4 p-5 sm:p-6 ${!form.slotWindow ? 'pointer-events-none opacity-50' : ''}`}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Service" error={errors.service} className="sm:col-span-2">
                  <select className={`${field('service')} [&>option]:bg-surface`} value={form.service} onChange={set('service')}>
                    <option value="">Select a service…</option>
                    {SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Full name" error={errors.fullName}>
                  <input className={field('fullName')} value={form.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Jane Doe" />
                </Field>
                <Field label="Phone" error={errors.phone}>
                  <input className={field('phone')} value={form.phone} onChange={set('phone')} type="tel" autoComplete="tel" placeholder="(312) 555-0100" />
                </Field>
                <Field label="Email" error={errors.email} className="sm:col-span-2">
                  <input className={field('email')} value={form.email} onChange={set('email')} type="email" autoComplete="email" placeholder="you@example.com" />
                </Field>
                <Field label="Service address" error={errors.address}>
                  <input className={field('address')} value={form.address} onChange={set('address')} autoComplete="street-address" placeholder="123 Main St, Schaumburg" />
                </Field>
                <Field label="ZIP code" error={errors.zipCode}>
                  <input className={field('zipCode')} value={form.zipCode} onChange={set('zipCode')} inputMode="numeric" autoComplete="postal-code" placeholder="60193" />
                </Field>
                <Field label="Anything we should know? (optional)" error={errors.notes} className="sm:col-span-2">
                  <textarea className={`${field('notes')} min-h-[80px] resize-y`} value={form.notes} onChange={set('notes')} placeholder="e.g. 2 furnaces, gate code 1234, dog in the yard" />
                </Field>
                <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-fg-muted sm:col-span-2">
                  <input type="checkbox" checked={form.smsConsent} onChange={(e) => setForm((f) => ({ ...f, smsConsent: e.target.checked }))} className="mt-0.5 h-4 w-4 shrink-0 accent-accent-400" />
                  <span>I agree to receive text messages about this appointment. Msg &amp; data rates may apply. Reply STOP to opt out.</span>
                </label>
                <div className="absolute -left-[9999px] top-0" aria-hidden="true">
                  <label>
                    Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
                  </label>
                </div>
              </div>
              {status === 'error' && <p className="mt-4 text-sm font-medium text-red-400">{serverMsg}</p>}
              <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" disabled={status === 'submitting' || !form.slotWindow} data-cta="booking-submit">
                {status === 'submitting' ? 'Sending…' : 'Request this appointment'} <Icon name="arrow" size={18} />
              </Button>
            </div>
          </div>

          {/* Summary */}
          <aside className="lg:col-span-5">
            <div className="card sticky top-28 p-6">
              <p className="eyebrow">Your appointment</p>
              <dl className="mt-4 space-y-3 text-[15px]">
                <Row label="Date" value={day?.label ?? '—'} />
                <Row label="Arrival window" value={form.slotWindow ? windowLabel(form.slotWindow) : '—'} />
                <Row label="Service" value={form.service || '—'} />
              </dl>
              <div className="mt-6 border-t border-line pt-5 text-sm text-fg-muted">
                <p className="flex gap-2">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent-400" /> No payment to book. Pay after the job.
                </p>
                <p className="mt-2 flex gap-2">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent-400" /> We call 30 minutes before arrival.
                </p>
                <p className="mt-2 flex gap-2">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent-400" /> Free to reschedule up to 24 hours before.
                </p>
              </div>
              <p className="mt-6 text-sm text-fg-muted">
                Prefer to talk?{' '}
                <a href={site.phoneHref} className="font-semibold text-accent-300">
                  {site.phone}
                </a>
              </p>
            </div>
          </aside>
        </form>
      </Section>
    </>
  )
}

function StepHeading({ n, title, active, done, className = '' }: { n: number; title: string; active: boolean; done: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold ${done ? 'bg-accent-400 text-bg' : active ? 'bg-tint/10 text-fg ring-1 ring-accent-400' : 'bg-tint/[0.05] text-fg-muted ring-1 ring-line'}`}>
        {done ? <Icon name="check" size={16} strokeWidth={3} /> : n}
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-right font-semibold text-fg">{value}</dd>
    </div>
  )
}

function Field({ label, error, className = '', children }: { label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-fg-soft">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-red-400">{error}</span>}
    </label>
  )
}
