import { useState, type FormEvent } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { adminApi } from '../../lib/api'
import { useFetch, useSeo } from '../../lib/hooks'
import { Logo } from '../../components/Logo'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/Button'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Inbox } from './Inbox'
import { ContentEditor } from './ContentEditor'
import { Chats } from './Chats'
import { Dashboard } from './Dashboard'
import { Bookings } from './Bookings'
import { Schedule } from './Schedule'
import { Settings } from './Settings'

const TOKEN_KEY = 'cleanduct.admin.token'

function readToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

const sections = [
  { to: 'dashboard', label: 'Dashboard', icon: 'home' },
  { to: 'bookings', label: 'Bookings', icon: 'clock' },
  { to: 'schedule', label: 'Schedule', icon: 'sun' },
  { to: 'leads', label: 'Quote requests', icon: 'mail' },
  { to: 'chats', label: 'Chats', icon: 'chat' },
  { to: 'content/services', label: 'Services', icon: 'wind' },
  { to: 'content/service-areas', label: 'Service areas', icon: 'pin' },
  { to: 'content/promotions', label: 'Promotions', icon: 'tag' },
  { to: 'content/testimonials', label: 'Reviews', icon: 'star' },
  { to: 'content/faqs', label: 'FAQs', icon: 'search' },
  { to: 'content/posts', label: 'Blog posts', icon: 'sparkles' },
  { to: 'settings', label: 'Settings', icon: 'wrench' },
]

export function Admin() {
  useSeo('Admin | CleanDuct')
  const [token, setToken] = useState(readToken)
  // Validate the token against the API whenever it changes.
  const check = useFetch(() => (token ? adminApi(token).me() : Promise.reject(new Error('no token'))), `auth-${token}`)
  const checked = !check.loading
  const valid = !!check.data?.ok

  if (!checked) return <div className="grid min-h-screen place-items-center text-fg-muted">Checking access…</div>
  if (!valid) return <Login onToken={(t) => { sessionStorage.setItem(TOKEN_KEY, t); setToken(t) }} failed={!!token} />

  return <Shell token={token} onLogout={() => { sessionStorage.removeItem(TOKEN_KEY); setToken('') }} />
}

function Login({ onToken, failed }: { onToken: (t: string) => void; failed: boolean }) {
  const [t, setT] = useState('')
  function submit(e: FormEvent) {
    e.preventDefault()
    if (t.trim()) onToken(t.trim())
  }
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <span className="font-display text-lg font-bold">CleanDuct Admin</span>
        </div>
        <p className="mt-4 text-sm text-fg-muted">Enter the admin token (the <code className="text-accent-300">ADMIN_TOKEN</code> value the server was started with).</p>
        <input
          type="password"
          value={t}
          onChange={(e) => setT(e.target.value)}
          placeholder="Admin token"
          autoFocus
          className="mt-4 w-full rounded-xl border border-line-strong bg-tint/[0.04] px-3.5 py-2.5 text-fg focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-400/15"
        />
        {failed && <p className="mt-2 text-xs font-medium text-red-400">That token was rejected.</p>}
        <Button type="submit" className="mt-5 w-full">
          Sign in
        </Button>
      </form>
    </div>
  )
}

function Shell({ token, onLogout }: { token: string; onLogout: () => void }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-bg-2 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate('/admin/dashboard')} className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="font-display font-bold">Admin</span>
          </button>
          <button className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
        <nav className={`${open ? 'block' : 'hidden'} px-3 pb-4 lg:block`}>
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={`/admin/${s.to}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium ${isActive ? 'bg-accent-400/10 text-accent-200' : 'text-fg-soft hover:bg-tint/[0.05] hover:text-fg'}`}
            >
              <Icon name={s.icon} size={18} /> {s.label}
            </NavLink>
          ))}
          <div className="mt-4 border-t border-line pt-4">
            <div className="flex items-center justify-between px-3 py-2 text-[14.5px] text-fg-muted">
              <span>Theme</span>
              <ThemeToggle />
            </div>
            <a href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] text-fg-muted hover:text-fg">
              <Icon name="arrow" size={18} className="rotate-180" /> View site
            </a>
            <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14.5px] text-fg-muted hover:text-fg">
              <Icon name="close" size={18} /> Sign out
            </button>
          </div>
        </nav>
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard token={token} />} />
          <Route path="bookings" element={<Bookings token={token} />} />
          <Route path="schedule" element={<Schedule token={token} />} />
          <Route path="leads" element={<Inbox token={token} kind="leads" />} />
          <Route path="chats" element={<Chats token={token} />} />
          <Route path="content/:resource" element={<ContentEditor token={token} />} />
          <Route path="settings" element={<Settings token={token} />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}
