import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi, api as publicApi, ApiError, type Booking } from '../../lib/api'
import { useFetch } from '../../lib/hooks'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Badge, PageTitle } from './ui'
import { INPUT, STATUS_LABEL, money, prettyDate, when } from './format'

const FILTERS = ['all', 'requested', 'confirmed', 'completed', 'cancelled'] as const
type Panel = 'accept' | 'reject' | 'reschedule' | 'price' | null

export function Bookings({ token }: { token: string }) {
  const api = adminApi(token)
  const [params, setParams] = useSearchParams()
  const filter = params.get('status') ?? 'all'
  const openId = Number(params.get('open') ?? 0)
  const [refresh, setRefresh] = useState(0)
  const { data, loading } = useFetch(() => api.bookings(), `bookings-${refresh}`)
  const availability = useFetch(() => publicApi.availability(), `availability-${refresh}`)

  const rows = (data ?? []).filter((b) => filter === 'all' || b.status === filter)
  const pending = (data ?? []).filter((b) => b.status === 'requested').length

  function setFilter(s: string) {
    const next = new URLSearchParams(params)
    if (s === 'all') next.delete('status')
    else next.set('status', s)
    next.delete('open')
    setParams(next, { replace: true })
  }

  return (
    <div>
      <PageTitle eyebrow="Orders" title="Bookings">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${filter === s ? 'bg-accent-400 text-bg ring-accent-400' : 'text-fg-soft ring-line hover:text-fg'}`}>
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
              {s === 'requested' && pending > 0 && <span className="ml-1 rounded-full bg-amber-400/20 px-1.5 text-[10px] text-amber-200">{pending}</span>}
            </button>
          ))}
        </div>
      </PageTitle>

      <div className="mt-6 space-y-3">
        {rows.length === 0 && <p className="card p-8 text-center text-sm text-fg-muted">{loading ? 'Loading…' : 'No bookings here.'}</p>}
        {rows.map((b) => (
          <BookingCard
            key={b.id}
            b={b}
            windows={availability.data?.windows ?? []}
            openDays={availability.data?.days ?? []}
            initiallyOpen={b.id === openId}
            api={api}
            onChange={() => setRefresh((n) => n + 1)}
          />
        ))}
      </div>
    </div>
  )
}

type Api = ReturnType<typeof adminApi>

function BookingCard({ b, windows, openDays, initiallyOpen, api, onChange }: { b: Booking; windows: string[]; openDays: { date: string; windows: Record<string, number> }[]; initiallyOpen: boolean; api: Api; onChange: () => void }) {
  const [panel, setPanel] = useState<Panel>(initiallyOpen ? 'accept' : null)
  const [price, setPrice] = useState(b.quotedPrice?.toString() ?? '')
  const [note, setNote] = useState(b.adminNote ?? '')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(b.slotDate)
  const [win, setWin] = useState(b.slotWindow)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const priceNum = price.trim() === '' ? null : Number(price)

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true)
    setMsg('')
    try {
      await fn()
      setPanel(null)
      setMsg(done)
      onChange()
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const act = (p: Panel) => () => setPanel((cur) => (cur === p ? null : p))
  const btn = (active: boolean, tone = '') =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${active ? 'bg-accent-400 text-bg ring-accent-400' : `${tone || 'text-fg-soft ring-line hover:text-fg'}`}`

  return (
    <div className={`card overflow-hidden ${b.status === 'requested' ? 'ring-1 ring-amber-400/30' : ''}`}>
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold text-fg">{b.fullName}</span>
            <Badge status={b.status} />
            <span className="text-xs text-fg-muted">· #{b.id} · requested {when(b.createdAt)}</span>
          </div>
          <p className="mt-1.5 text-sm text-fg">
            <Icon name="clock" size={14} className="mr-1 inline text-accent-400" />
            <strong>{prettyDate(b.slotDate)}</strong> · {b.slotWindow} · {b.service}
          </p>
          <p className="mt-1 text-sm text-fg-soft">
            <a href={`tel:${b.phone}`} className="text-accent-300">{b.phone}</a> · <a href={`mailto:${b.email}`} className="text-accent-300">{b.email}</a>
            {b.smsConsent && <span className="text-fg-muted"> · OK to text</span>}
          </p>
          <p className="mt-1 text-sm text-fg-soft">
            <Icon name="pin" size={13} className="mr-1 inline text-fg-muted" />
            {b.address}, {b.zipCode}
          </p>
          {b.notes && <p className="mt-2 rounded-lg bg-tint/[0.04] p-3 text-sm text-fg-soft">“{b.notes}”</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
            <span>
              Quote: <strong className="text-fg">{money(b.quotedPrice)}</strong>
            </span>
            {b.adminNote && <span>Note to customer: {b.adminNote}</span>}
            {b.declineReason && <span className="text-red-300">Declined: {b.declineReason}</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 self-start sm:flex-col sm:items-stretch">
          {b.status !== 'confirmed' && b.status !== 'completed' && (
            <button onClick={act('accept')} className={btn(panel === 'accept', 'bg-emerald-400/10 text-emerald-200 ring-emerald-400/30 hover:bg-emerald-400/20')}>
              ✓ Accept
            </button>
          )}
          {b.status !== 'cancelled' && b.status !== 'completed' && (
            <button onClick={act('reject')} className={btn(panel === 'reject', 'bg-red-400/10 text-red-200 ring-red-400/30 hover:bg-red-400/20')}>
              ✕ Decline
            </button>
          )}
          {b.status !== 'completed' && (
            <button onClick={act('reschedule')} className={btn(panel === 'reschedule')}>
              Reschedule
            </button>
          )}
          <button onClick={act('price')} className={btn(panel === 'price')}>
            Price & note
          </button>
          {b.status === 'confirmed' && (
            <button onClick={() => run(() => api.setBookingStatus(b.id, 'completed'), 'Marked completed.')} className={btn(false)}>
              Mark done
            </button>
          )}
        </div>
      </div>

      {msg && <p className={`border-t border-line px-5 py-2.5 text-xs ${msg.endsWith('.') && !msg.includes('wrong') ? 'text-emerald-300' : 'text-red-300'}`}>{msg}</p>}

      {panel && (
        <form
          className="border-t border-line bg-tint/[0.02] p-4 sm:p-5"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (panel === 'accept') run(() => api.acceptBooking(b.id, { quotedPrice: priceNum, note }), 'Accepted — confirmation email sent to the customer.')
            if (panel === 'reject') run(() => api.rejectBooking(b.id, { reason }), 'Declined — the customer has been emailed.')
            if (panel === 'reschedule') run(() => api.rescheduleBooking(b.id, { slotDate: date, slotWindow: win, note }), 'Rescheduled — the customer has been emailed the new time.')
            if (panel === 'price') run(() => api.updateBookingDetails(b.id, { quotedPrice: priceNum, note }), 'Saved.')
          }}
        >
          {panel === 'accept' && (
            <>
              <h3 className="font-display font-bold">Accept this booking</h3>
              <p className="mt-1 text-sm text-fg-muted">The customer gets a confirmation email with the date, arrival window and (if you enter one) the quoted price.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                <Field label="Quoted price ($)">
                  <input type="number" min={0} max={100000} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 349" className={INPUT} />
                </Field>
                <Field label="Message to customer (optional)">
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Please make sure the furnace area is accessible." className={INPUT} maxLength={500} />
                </Field>
              </div>
            </>
          )}
          {panel === 'reject' && (
            <>
              <h3 className="font-display font-bold">Decline this booking</h3>
              <p className="mt-1 text-sm text-fg-muted">Frees the time slot and emails the customer. A short reason helps them rebook.</p>
              <Field label="Reason (sent to customer)" className="mt-3">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="We're fully booked that day — please pick another slot." className={INPUT} maxLength={500} required />
              </Field>
            </>
          )}
          {panel === 'reschedule' && (
            <>
              <h3 className="font-display font-bold">Move to another time</h3>
              <p className="mt-1 text-sm text-fg-muted">Slots already at capacity are marked full. The customer is emailed the new time.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[180px_220px_1fr]">
                <Field label="Date">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} required />
                </Field>
                <Field label="Arrival window">
                  <select value={win} onChange={(e) => setWin(e.target.value)} className={INPUT}>
                    {(windows.length ? windows : [b.slotWindow]).map((w) => {
                      const day = openDays.find((d) => d.date === date)
                      const left = day ? day.windows[w] : undefined
                      const full = left !== undefined && left <= 0 && !(date === b.slotDate && w === b.slotWindow)
                      return (
                        <option key={w} value={w}>
                          {w}
                          {left !== undefined ? (full ? ' — full' : ` — ${left} open`) : ''}
                        </option>
                      )
                    })}
                  </select>
                </Field>
                <Field label="Message to customer (optional)">
                  <input value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} maxLength={500} />
                </Field>
              </div>
            </>
          )}
          {panel === 'price' && (
            <>
              <h3 className="font-display font-bold">Price & internal note</h3>
              <p className="mt-1 text-sm text-fg-muted">Saves quietly — no email is sent. The note is included the next time you accept or reschedule.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                <Field label="Quoted price ($)">
                  <input type="number" min={0} max={100000} value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT} />
                </Field>
                <Field label="Note">
                  <input value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} maxLength={500} />
                </Field>
              </div>
            </>
          )}
          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? 'Working…' : panel === 'accept' ? 'Accept & email customer' : panel === 'reject' ? 'Decline & email customer' : panel === 'reschedule' ? 'Move & email customer' : 'Save'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPanel(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fg-muted">{label}</span>
      {children}
    </label>
  )
}
