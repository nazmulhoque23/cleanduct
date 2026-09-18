import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, api as publicApi } from '../../lib/api'
import { useFetch } from '../../lib/hooks'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { PageTitle } from './ui'
import { INPUT, money, prettyDate } from './format'

function isoDate(d: Date) {
  // Local calendar date (not UTC), so the list starts on the owner's "today".
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function Schedule({ token }: { token: string }) {
  const api = adminApi(token)
  const [refresh, setRefresh] = useState(0)
  const today = isoDate(new Date())
  const bookings = useFetch(() => api.bookings(today), `sched-bookings-${refresh}`)
  const blocked = useFetch(() => api.blockedDates(), `blocked-${refresh}`)
  const avail = useFetch(() => publicApi.availability(), `sched-avail-${refresh}`)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')

  const blockedMap = new Map((blocked.data ?? []).map((b) => [b.date, b.reason]))
  const windows = avail.data?.windows ?? []

  // 21 days from today, grouped by date.
  const days: string[] = []
  for (let i = 0; i < 21; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push(isoDate(d))
  }
  const byDate = new Map<string, NonNullable<typeof bookings.data>>()
  for (const b of bookings.data ?? []) {
    if (b.status === 'cancelled') continue
    byDate.set(b.slotDate, [...(byDate.get(b.slotDate) ?? []), b])
  }

  async function block(e: FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      await api.addBlockedDate(date, reason)
      setDate('')
      setReason('')
      setRefresh((n) => n + 1)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not block that date.')
    }
  }
  async function unblock(d: string) {
    await api.removeBlockedDate(d)
    setRefresh((n) => n + 1)
  }

  return (
    <div>
      <PageTitle eyebrow="Calendar" title="Schedule">
        <Link to="/admin/settings" className="text-sm font-semibold text-accent-300">
          Arrival windows & capacity →
        </Link>
      </PageTitle>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-2">
          {days.map((d) => {
            const jobs = byDate.get(d) ?? []
            const isBlocked = blockedMap.has(d)
            const dt = new Date(d + 'T12:00:00')
            const sunday = dt.getDay() === 0
            const openDay = avail.data?.days.find((x) => x.date === d)
            return (
              <div key={d} className={`card p-4 ${isBlocked ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-display font-bold ${d === today ? 'text-accent-300' : 'text-fg'}`}>{prettyDate(d)}</span>
                  {d === today && <span className="text-xs text-fg-muted">today</span>}
                  {sunday && <span className="rounded-full bg-tint/10 px-2 py-0.5 text-[11px] text-fg-muted">closed</span>}
                  {isBlocked && <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-[11px] text-red-200">blocked · {blockedMap.get(d) || 'no reason'}</span>}
                  <span className="ml-auto text-xs text-fg-muted">
                    {jobs.length} job{jobs.length === 1 ? '' : 's'}
                    {openDay && !isBlocked && ` · ${Object.values(openDay.windows).reduce((a, n) => a + n, 0)} open slots`}
                  </span>
                </div>
                {jobs.length > 0 && (
                  <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {jobs
                      .slice()
                      .sort((a, b) => a.slotWindow.localeCompare(b.slotWindow))
                      .map((b) => (
                        <li key={b.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-inset ${b.status === 'requested' ? 'bg-amber-400/10 ring-amber-400/30' : b.status === 'completed' ? 'bg-tint/[0.04] ring-line' : 'bg-emerald-400/10 ring-emerald-400/25'}`}>
                          <span className="w-[92px] shrink-0 text-xs font-semibold text-fg-soft">{b.slotWindow}</span>
                          <Link to={`/admin/bookings?open=${b.id}`} className="min-w-0 flex-1 truncate font-semibold text-fg hover:text-accent-300">
                            {b.fullName}
                          </Link>
                          <span className="truncate text-xs text-fg-muted">{b.service}</span>
                          <span className="text-xs text-fg-muted">{money(b.quotedPrice)}</span>
                        </li>
                      ))}
                  </ul>
                )}
                {windows.length > 0 && jobs.length === 0 && !sunday && !isBlocked && <p className="mt-1 text-xs text-fg-muted">Nothing booked.</p>}
              </div>
            )
          })}
        </section>

        <aside className="space-y-4 self-start lg:sticky lg:top-6">
          <form onSubmit={block} className="card p-5">
            <h2 className="font-display font-bold">Block a date</h2>
            <p className="mt-1 text-sm text-fg-muted">Holidays, vacation, or a day you're already booked offline. Customers can't pick blocked dates.</p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fg-muted">Date</span>
              <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className={INPUT} required />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fg-muted">Reason (optional)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Thanksgiving" className={INPUT} maxLength={120} />
            </label>
            {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
            <Button type="submit" size="sm" className="mt-4 w-full">
              Block date
            </Button>
          </form>

          <div className="card p-5">
            <h2 className="font-display font-bold">Blocked dates</h2>
            {(blocked.data ?? []).length === 0 && <p className="mt-2 text-sm text-fg-muted">None upcoming.</p>}
            <ul className="mt-2 divide-y divide-line">
              {(blocked.data ?? []).map((b) => (
                <li key={b.date} className="flex items-center gap-2 py-2 text-sm">
                  <span className="font-semibold text-fg">{prettyDate(b.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-fg-muted">{b.reason}</span>
                  <button onClick={() => unblock(b.date)} className="rounded p-1 text-fg-muted hover:text-red-300" aria-label="Unblock">
                    <Icon name="close" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
