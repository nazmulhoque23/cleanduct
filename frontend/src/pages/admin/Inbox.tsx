import { useState } from 'react'
import { adminApi, type Booking, type Lead } from '../../lib/api'
import { useFetch } from '../../lib/hooks'
import { Icon } from '../../components/Icon'

const LEAD_STATUSES = ['new', 'contacted', 'booked', 'closed'] as const
const BOOKING_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'] as const

const tone: Record<string, string> = {
  new: 'bg-accent-400/15 text-accent-200 ring-accent-400/30',
  requested: 'bg-accent-400/15 text-accent-200 ring-accent-400/30',
  contacted: 'bg-amber-400/15 text-amber-200 ring-amber-400/30',
  confirmed: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30',
  booked: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30',
  completed: 'bg-tint/10 text-fg-soft ring-line-strong',
  closed: 'bg-tint/10 text-fg-soft ring-line-strong',
  cancelled: 'bg-red-400/15 text-red-200 ring-red-400/30',
}

export function Inbox({ token, kind }: { token: string; kind: 'leads' | 'bookings' }) {
  const api = adminApi(token)
  const [refresh, setRefresh] = useState(0)
  const [filter, setFilter] = useState('all')
  const leads = useFetch(() => (kind === 'leads' ? api.leads() : Promise.resolve([] as Lead[])), `leads-${kind}-${refresh}`)
  const bookings = useFetch(() => (kind === 'bookings' ? api.bookings() : Promise.resolve([] as Booking[])), `bookings-${kind}-${refresh}`)
  const statuses = kind === 'leads' ? LEAD_STATUSES : BOOKING_STATUSES
  const rows = (kind === 'leads' ? leads.data ?? [] : bookings.data ?? []).filter((r) => filter === 'all' || r.status === filter)

  async function setStatus(id: number, status: string) {
    if (kind === 'leads') await api.setLeadStatus(id, status)
    else await api.setBookingStatus(id, status)
    setRefresh((n) => n + 1)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="mt-1 text-2xl font-bold">{kind === 'leads' ? 'Quote requests' : 'Online bookings'}</h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['all', ...statuses].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset ${filter === s ? 'bg-accent-400 text-bg ring-accent-400' : 'text-fg-soft ring-line hover:text-fg'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card mt-6 overflow-hidden">
        {rows.length === 0 && <p className="p-8 text-center text-sm text-fg-muted">{leads.loading || bookings.loading ? 'Loading…' : 'Nothing here yet.'}</p>}
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-bold text-fg">{r.fullName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${tone[r.status]}`}>{r.status}</span>
                  {r.smsConsent && <span className="text-[11px] text-fg-muted">· OK to text</span>}
                  <span className="text-xs text-fg-muted">· {new Date(r.createdAt.replace(' ', 'T') + (r.createdAt.endsWith('Z') ? '' : 'Z')).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-fg-soft">
                  <a href={`tel:${r.phone}`} className="text-accent-300">{r.phone}</a> · <a href={`mailto:${r.email}`} className="text-accent-300">{r.email}</a>
                  {r.zipCode && <> · {r.zipCode}</>}
                </p>
                {'slotDate' in r ? (
                  <p className="mt-1 text-sm text-fg">
                    <Icon name="clock" size={14} className="mr-1 inline text-accent-400" />
                    {r.slotDate} · {r.slotWindow} · {r.service} · {r.address}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-fg">
                    {r.service || 'No service chosen'} · prefers {r.contactPref} · from {r.sourcePage || '/'}
                  </p>
                )}
                {('message' in r ? r.message : r.notes) && <p className="mt-2 rounded-lg bg-tint/[0.04] p-3 text-sm text-fg-soft">{'message' in r ? r.message : r.notes}</p>}
              </div>
              <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="h-9 self-start rounded-lg border border-line-strong bg-surface px-2 text-sm text-fg">
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
