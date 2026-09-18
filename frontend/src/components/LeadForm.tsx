import { useState, type FormEvent, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { api, ApiError, type LeadInput } from '../lib/api'
import { useSite } from '../lib/site-context'
import { track } from '../lib/analytics'
import { Button } from './Button'
import { Icon } from './Icon'

const SERVICE_OPTIONS = [
  'Air Duct Cleaning',
  'Dryer Vent Cleaning',
  'Chimney Sweep & Fireplace Cleaning',
  'UV Light & Air Purification',
  'Duct Sanitizing & Odor Removal',
  'Duct Repair & Sealing',
  'HVAC & Air Duct Inspection',
  'Commercial Service',
  'Not sure — need advice',
]

const empty: LeadInput = {
  fullName: '',
  email: '',
  phone: '',
  zipCode: '',
  service: '',
  contactPref: 'phone',
  message: '',
  sourcePage: '',
  smsConsent: false,
  website: '',
}

interface Props {
  compact?: boolean
  title?: string
  className?: string
}

export function LeadForm({ compact = false, title = 'Get your free quote', className = '' }: Props) {
  const site = useSite()
  const { pathname } = useLocation()
  const [form, setForm] = useState<LeadInput>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [serverMsg, setServerMsg] = useState('')

  const set = (k: keyof LeadInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrors({})
    try {
      await api.createLead({ ...form, sourcePage: pathname })
      track('lead_submit', { service: form.service || 'unspecified', page: pathname })
      setStatus('success')
      setForm(empty)
    } catch (err) {
      setStatus('error')
      if (err instanceof ApiError) {
        setErrors(err.fields ?? {})
        setServerMsg(err.fields ? 'Please fix the highlighted fields.' : err.message)
      } else {
        setServerMsg('Something went wrong. Please call us instead.')
      }
    }
  }

  const shell = `relative overflow-hidden rounded-3xl bg-surface/80 p-6 shadow-lift ring-1 ring-line backdrop-blur-xl sm:p-8 ${className}`

  if (status === 'success') {
    return (
      <div className={`${shell} text-center`}>
        <Glow />
        <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-400/15 text-accent-300 ring-1 ring-accent-400/40">
          <Icon name="check" size={28} />
        </div>
        <h3 className="relative mt-4 text-xl font-bold">Request received!</h3>
        <p className="relative mt-2 text-fg-muted">
          We'll reach out within one business hour during open hours. Need it faster? Call{' '}
          <a href={site.phoneHref} className="font-semibold text-accent-300">
            {site.phone}
          </a>
          .
        </p>
        <Button variant="ghost" size="sm" className="relative mt-5" onClick={() => setStatus('idle')}>
          Send another request
        </Button>
      </div>
    )
  }

  const field = (k: keyof LeadInput) =>
    `w-full rounded-xl border bg-white/[0.04] px-3.5 py-2.5 text-[15px] text-fg placeholder:text-fg-muted/70 transition-all ` +
    (errors[k] ? 'border-red-400/70 focus:border-red-400' : 'border-line-strong hover:border-white/25 focus:border-accent-400') +
    ' focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-accent-400/15'

  return (
    <form onSubmit={onSubmit} className={shell} noValidate>
      <Glow />
      <div className="relative mb-5">
        <p className="eyebrow mb-2">Free estimate</p>
        <h3 className="text-xl font-bold sm:text-2xl">{title}</h3>
        <p className="mt-1 text-sm text-fg-muted">Upfront pricing. No obligation. Same-week appointments available.</p>
      </div>

      <div className={`relative grid gap-4 ${compact ? '' : 'sm:grid-cols-2'}`}>
        <Field label="Full name" error={errors.fullName}>
          <input className={field('fullName')} value={form.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Jane Doe" />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input className={field('phone')} value={form.phone} onChange={set('phone')} type="tel" autoComplete="tel" placeholder="(312) 555-0100" />
        </Field>
        <Field label="Email" error={errors.email}>
          <input className={field('email')} value={form.email} onChange={set('email')} type="email" autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label="ZIP code" error={errors.zipCode}>
          <input className={field('zipCode')} value={form.zipCode} onChange={set('zipCode')} inputMode="numeric" autoComplete="postal-code" placeholder="60193" />
        </Field>
        <Field label="Service needed" className={compact ? '' : 'sm:col-span-2'}>
          <select className={`${field('service')} [&>option]:bg-surface`} value={form.service} onChange={set('service')}>
            <option value="">Select a service…</option>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        {!compact && (
          <Field label="Tell us about your home or issue (optional)" className="sm:col-span-2" error={errors.message}>
            <textarea className={`${field('message')} min-h-[96px] resize-y`} value={form.message} onChange={set('message')} placeholder="e.g. 2-story home, 1 furnace, dog that sheds, musty smell in basement" />
          </Field>
        )}
        <div className={compact ? '' : 'sm:col-span-2'}>
          <span className="mb-2 block text-sm font-medium text-fg-soft">Preferred contact</span>
          <div className="flex flex-wrap gap-2">
            {(['phone', 'text', 'email'] as const).map((p) => (
              <label
                key={p}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium capitalize ring-1 ring-inset transition-all ${
                  form.contactPref === p ? 'bg-accent-400 text-bg ring-accent-400' : 'bg-white/[0.04] text-fg-soft ring-line-strong hover:text-fg hover:ring-white/30'
                }`}
              >
                <input type="radio" name="contactPref" className="sr-only" checked={form.contactPref === p} onChange={() => setForm((f) => ({ ...f, contactPref: p }))} />
                {p}
              </label>
            ))}
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-fg-muted">
            <input
              type="checkbox"
              checked={form.smsConsent}
              onChange={(e) => setForm((f) => ({ ...f, smsConsent: e.target.checked }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong bg-white/[0.04] accent-accent-400"
            />
            <span>
              I agree to receive text messages about my request at the number provided. Msg &amp; data rates may apply. Reply STOP to opt out.
              {errors.smsConsent && <span className="mt-1 block font-medium text-red-400">{errors.smsConsent}</span>}
            </span>
          </label>
        </div>
        {/* Honeypot — hidden from humans */}
        <div className="absolute -left-[9999px] top-0" aria-hidden="true">
          <label>
            Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
          </label>
        </div>
      </div>

      {status === 'error' && <p className="relative mt-4 text-sm font-medium text-red-400">{serverMsg}</p>}

      <Button type="submit" size="lg" className="relative mt-6 w-full" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Request my free quote'}
        <Icon name="arrow" size={18} />
      </Button>
      <p className="relative mt-3 text-center text-xs leading-relaxed text-fg-muted">
        By submitting, you agree we may contact you by phone, text or email about your request. We never share your information.
      </p>
    </form>
  )
}

function Glow() {
  return (
    <>
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-400/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/60 to-transparent" />
    </>
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
