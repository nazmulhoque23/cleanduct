import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api'
import { useFetch } from '../../lib/hooks'
import { Icon } from '../../components/Icon'
import { Badge, PageTitle } from './ui'
import { money, prettyDate, when } from './format'

export function Dashboard({ token }: { token: string }) {
  const api = adminApi(token)
  const { data, loading } = useFetch(() => api.dashboard(), 'dashboard')
  const s = data?.stats

  const tiles = [
    { label: 'Pending bookings', value: s?.pendingBookings, to: '/admin/bookings?status=requested', hot: (s?.pendingBookings ?? 0) > 0 },
    { label: 'New quote requests', value: s?.newLeads, to: '/admin/leads', hot: (s?.newLeads ?? 0) > 0 },
    { label: 'Jobs today', value: s?.bookingsToday, to: '/admin/schedule' },
    { label: 'Jobs next 7 days', value: s?.bookingsThisWeek, to: '/admin/schedule' },
    { label: 'Completed this month', value: s?.completedThisMonth, to: '/admin/bookings?status=completed' },
    { label: 'Quoted this month', value: s ? money(s.quotedThisMonth) : undefined, to: '/admin/bookings' },
    { label: 'Leads this month', value: s?.leadsThisMonth, to: '/admin/leads' },
    { label: 'Chat sessions today', value: s?.chatsToday, to: '/admin/chats' },
  ]

  return (
    <div>
      <PageTitle eyebrow="Overview" title="Dashboard">
        <p className="text-sm text-fg-muted">{data ? prettyDate(data.today) : ''}</p>
      </PageTitle>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className={`card p-4 transition hover:-translate-y-0.5 ${t.hot ? 'ring-1 ring-accent-400/40' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{t.label}</p>
            <p className={`mt-2 font-display text-3xl font-bold ${t.hot ? 'text-accent-300' : 'text-fg'}`}>{loading ? '…' : t.value ?? 0}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display font-bold">Next jobs</h2>
            <Link to="/admin/bookings" className="text-sm font-semibold text-accent-300">
              All bookings →
            </Link>
          </div>
          {data && data.upcoming.length === 0 && <p className="p-6 text-sm text-fg-muted">No upcoming jobs. When a customer books online it shows up here.</p>}
          <ul className="divide-y divide-line">
            {data?.upcoming.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                <div className="w-28 shrink-0">
                  <p className="text-sm font-semibold text-fg">{prettyDate(b.slotDate)}</p>
                  <p className="text-xs text-fg-muted">{b.slotWindow}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">
                    {b.fullName} <span className="font-normal text-fg-muted">· {b.service}</span>
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    {b.address}, {b.zipCode} · {money(b.quotedPrice)}
                  </p>
                </div>
                <Badge status={b.status} />
                {b.status === 'requested' && (
                  <Link to={`/admin/bookings?open=${b.id}`} className="rounded-lg bg-accent-400/10 px-3 py-1.5 text-xs font-semibold text-accent-200 hover:bg-accent-400/20">
                    Review
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display font-bold">Call back</h2>
            <Link to="/admin/leads" className="text-sm font-semibold text-accent-300">
              All leads →
            </Link>
          </div>
          {data && data.newLeads.length === 0 && <p className="p-6 text-sm text-fg-muted">No new quote requests waiting.</p>}
          <ul className="divide-y divide-line">
            {data?.newLeads.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{l.fullName}</p>
                  <p className="truncate text-xs text-fg-muted">
                    {l.service || 'No service chosen'} {l.zipCode && `· ${l.zipCode}`} · {when(l.createdAt)}
                  </p>
                </div>
                <a href={`tel:${l.phone}`} className="flex items-center gap-1.5 rounded-lg bg-tint/[0.05] px-3 py-1.5 text-xs font-semibold text-fg hover:bg-tint/10">
                  <Icon name="phone" size={13} /> {l.phone}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
