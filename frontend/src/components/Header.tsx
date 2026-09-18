import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useFetch } from '../lib/hooks'
import { useSite } from '../lib/site-context'
import { Button } from './Button'
import { Icon } from './Icon'
import { Logo } from './Logo'

const nav = [
  { to: '/services', label: 'Services', menu: 'services' as const },
  { to: '/service-areas', label: 'Service Areas', menu: 'areas' as const },
  { to: '/reviews', label: 'Reviews' },
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
]

type MenuKey = 'services' | 'areas' | null

export function Header() {
  const site = useSite()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState<MenuKey>(null)
  const closeTimer = useRef<number | null>(null)
  const { pathname } = useLocation()

  // Close menus whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
    setMenu(null)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Hover intent: open immediately, close after a short grace period so the
  // pointer can travel from the label down into the panel.
  const show = (k: MenuKey) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setMenu(k)
  }
  const hide = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setMenu(null), 140)
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-bg/80 shadow-[0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl' : 'bg-bg'
      }`}
      onKeyDown={(e) => e.key === 'Escape' && setMenu(null)}
    >
      {/* Top utility bar */}
      <div className="hidden border-b border-line text-[13px] text-fg-muted lg:block">
        <div className="container-x flex h-9 items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" size={14} className="text-accent-400" /> {site.hours[0]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="pin" size={14} className="text-accent-400" /> Schaumburg, IL · Serving all of Chicagoland
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="star" size={14} className="fill-amber-400 text-amber-400" strokeWidth={0} />
            <strong className="text-fg">{site.rating.toFixed(1)}</strong>
            <span>from {site.reviewCount.toLocaleString()} Google reviews</span>
          </div>
        </div>
      </div>

      <div className="container-x flex h-[76px] items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${site.name} home`}>
          <Logo />
          <span className="font-display text-[19px] font-bold leading-tight text-fg">
            CleanDuct
            <span className="block whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.2em] text-fg-muted">Air Duct Cleaning</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {nav.map((n) => {
            const hasMenu = !!n.menu
            const isOpen = hasMenu && menu === n.menu
            return (
              <div
                key={n.to}
                className="relative"
                onMouseEnter={() => hasMenu && show(n.menu!)}
                onMouseLeave={() => hasMenu && hide()}
                onFocus={() => hasMenu && show(n.menu!)}
                onBlur={(e) => hasMenu && !e.currentTarget.contains(e.relatedTarget as Node) && hide()}
              >
                <NavLink
                  to={n.to}
                  aria-haspopup={hasMenu ? 'true' : undefined}
                  aria-expanded={hasMenu ? isOpen : undefined}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-[14.5px] font-medium transition-colors ${
                      isActive || isOpen ? 'bg-white/[0.06] text-fg' : 'text-fg-soft hover:bg-white/[0.06] hover:text-fg'
                    }`
                  }
                >
                  {n.label}
                  {hasMenu && <Icon name="chevron" size={14} className={`transition-transform ${isOpen ? 'rotate-180 text-accent-400' : 'text-fg-muted'}`} />}
                </NavLink>
                {hasMenu && (
                  <MegaPanel open={isOpen} wide={n.menu === 'areas'}>
                    {n.menu === 'services' ? <ServicesMenu /> : <AreasMenu />}
                  </MegaPanel>
                )}
              </div>
            )
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <a href={site.phoneHref} className="group flex items-center gap-2.5 pr-1">
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-accent-400/10 text-accent-400 ring-1 ring-accent-400/20 transition-colors group-hover:bg-accent-400 group-hover:text-bg">
              <Icon name="phone" size={18} />
            </span>
            <span className="leading-tight">
              <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-muted">Call or text</span>
              <span className="block whitespace-nowrap font-display text-[17px] font-bold text-fg">{site.phone}</span>
            </span>
          </a>
          <Button to="/contact">Get a Free Quote</Button>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <a href={site.phoneHref} className="grid h-10 w-10 place-items-center rounded-full bg-accent-400 text-bg" aria-label={`Call ${site.phone}`}>
            <Icon name="phone" size={18} />
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-full text-fg ring-1 ring-line-strong"
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            <Icon name={open ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`overflow-hidden border-t border-line bg-bg transition-[max-height] duration-300 lg:hidden ${open ? 'max-h-[520px]' : 'max-h-0 border-t-0'}`}>
        <nav className="container-x flex flex-col py-3" aria-label="Mobile">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `rounded-xl px-3 py-3 text-base font-medium ${isActive ? 'bg-white/[0.06] text-fg' : 'text-fg-soft'}`}
            >
              {n.label}
            </NavLink>
          ))}
          <div className="mt-2 flex gap-2 pb-2">
            <Button to="/contact" className="flex-1">
              Get a Free Quote
            </Button>
            <Button href={site.phoneHref} variant="secondary" className="flex-1">
              <Icon name="phone" size={16} /> Call
            </Button>
          </div>
        </nav>
      </div>
    </header>
  )
}

/* ---------- Mega-menu panel shell ----------------------------------------- */

function MegaPanel({ open, wide, children }: { open: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <div
      className={`absolute left-0 top-full z-50 pt-3 transition-all duration-200 ${
        open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
      } ${wide ? 'w-[700px]' : 'w-[760px]'}`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-surface/95 p-2 shadow-lift ring-1 ring-line backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent-400/15 blur-3xl" />
        {children}
      </div>
    </div>
  )
}

function ServicesMenu() {
  const { data } = useFetch(() => api.services(), 'services-all')
  const services = data ?? []
  const residential = services.filter((s) => s.category === 'residential')
  const commercial = services.filter((s) => s.category === 'commercial')

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <div className="grid grid-cols-2 gap-1 p-2">
        <p className="col-span-2 px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-fg-muted">Residential</p>
        {residential.map((s) => (
          <MenuItem key={s.slug} to={`/services/${s.slug}`} icon={s.icon} title={s.name} sub={s.startingAt ? `From $${s.startingAt}` : 'Custom quote'} />
        ))}
        <p className="col-span-2 px-2 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-fg-muted">Commercial</p>
        {commercial.map((s) => (
          <MenuItem key={s.slug} to={`/services/${s.slug}`} icon={s.icon} title={s.name} sub="Custom quote" />
        ))}
      </div>
      <Link
        to="/services"
        className="group flex w-44 flex-col justify-between rounded-xl bg-gradient-to-b from-accent-400/15 to-glow-indigo/10 p-4 ring-1 ring-inset ring-accent-400/20 transition hover:ring-accent-400/50"
      >
        <span>
          <Icon name="wind" size={26} className="text-accent-400" />
          <span className="mt-3 block font-display text-[15px] font-bold text-fg">All services</span>
          <span className="mt-1 block text-xs leading-relaxed text-fg-muted">Flat-rate pricing. Camera-verified results.</span>
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-400 transition-transform group-hover:translate-x-1">
          Browse <Icon name="arrow" size={15} />
        </span>
      </Link>
    </div>
  )
}

function AreasMenu() {
  const { data } = useFetch(api.serviceAreas, 'areas')
  const areas = data ?? []
  const featured = areas.filter((a) => a.featured)
  const rest = areas.filter((a) => !a.featured).slice(0, 12)

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <div className="p-2">
        <p className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-fg-muted">Most requested</p>
        <div className="grid grid-cols-2 gap-1">
          {featured.map((a) => (
            <MenuItem key={a.slug} to={`/service-areas/${a.slug}`} icon="pin" title={`${a.city}, ${a.state}`} sub={a.zipCodes} />
          ))}
        </div>
        <p className="px-2 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-fg-muted">Also serving</p>
        <div className="flex flex-wrap gap-1.5 px-2 pb-1">
          {rest.map((a) => (
            <Link key={a.slug} to={`/service-areas/${a.slug}`} className="rounded-full px-2.5 py-1 text-xs text-fg-soft ring-1 ring-inset ring-line transition hover:bg-white/[0.06] hover:text-fg hover:ring-line-strong">
              {a.city}
            </Link>
          ))}
        </div>
      </div>
      <Link
        to="/service-areas"
        className="group flex w-44 flex-col justify-between rounded-xl bg-gradient-to-b from-accent-400/15 to-glow-indigo/10 p-4 ring-1 ring-inset ring-accent-400/20 transition hover:ring-accent-400/50"
      >
        <span>
          <Icon name="pin" size={26} className="text-accent-400" />
          <span className="mt-3 block font-display text-[15px] font-bold text-fg">{areas.length || '40'}+ areas</span>
          <span className="mt-1 block text-xs leading-relaxed text-fg-muted">Search by city or ZIP to check coverage.</span>
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-400 transition-transform group-hover:translate-x-1">
          View all <Icon name="arrow" size={15} />
        </span>
      </Link>
    </div>
  )
}

function MenuItem({ to, icon, title, sub }: { to: string; icon: string; title: string; sub: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.06]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-400/10 text-accent-300 ring-1 ring-inset ring-accent-400/15 transition group-hover:bg-accent-400 group-hover:text-bg">
        <Icon name={icon} size={17} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[13.5px] font-semibold leading-tight text-fg">{title}</span>
        <span className="block text-[11.5px] text-fg-muted">{sub}</span>
      </span>
    </Link>
  )
}
