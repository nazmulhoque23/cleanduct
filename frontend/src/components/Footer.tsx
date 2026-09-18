import { Link } from 'react-router-dom'
import { useSite } from '../lib/site-context'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { Stars } from './Stars'

const services = [
  ['Air Duct Cleaning', '/services/air-duct-cleaning'],
  ['Dryer Vent Cleaning', '/services/dryer-vent-cleaning'],
  ['Chimney Sweep', '/services/chimney-sweep'],
  ['UV Light & Purification', '/services/uv-light-installation'],
  ['Duct Sanitizing', '/services/duct-sanitizing'],
  ['Commercial Duct Cleaning', '/services/commercial-air-duct-cleaning'],
]

const company = [
  ['About Us', '/about'],
  ['Reviews', '/reviews'],
  ['Service Areas', '/service-areas'],
  ['Specials', '/#specials'],
  ['Blog', '/blog'],
  ['Contact', '/contact'],
]

export function Footer() {
  const site = useSite()
  return (
    <footer className="relative border-t border-line bg-bg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent" />
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-lg font-bold text-fg">{site.name}</span>
          </Link>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-fg-muted">
            Locally owned since {site.yearFounded}. Licensed, bonded, insured and NADCA-trained — with a 100% satisfaction guarantee on every job.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <Stars rating={site.rating} />
            <span className="text-sm text-fg-soft">
              <strong className="text-fg">{site.rating.toFixed(1)}</strong> · {site.reviewCount.toLocaleString()} reviews
            </span>
          </div>
          <div className="mt-6 flex gap-2">
            {(['facebook', 'instagram', 'youtube', 'google'] as const).map((k) => (
              <a
                key={k}
                href={site.social[k]}
                className="grid h-9 w-9 place-items-center rounded-full bg-tint/[0.05] text-xs font-bold uppercase text-fg ring-1 ring-inset ring-line transition hover:bg-accent-400 hover:text-bg"
                aria-label={k}
              >
                {k[0]}
              </a>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg-muted">Services</h3>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            {services.map(([label, to]) => (
              <li key={to}>
                <Link to={to} className="text-fg-soft transition-colors hover:text-accent-300">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg-muted">Company</h3>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            {company.map(([label, to]) => (
              <li key={to}>
                <Link to={to} className="text-fg-soft transition-colors hover:text-accent-300">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg-muted">Contact</h3>
          <ul className="mt-4 space-y-3 text-[15px] text-fg-soft">
            <li className="flex gap-3">
              <Icon name="phone" size={18} className="mt-0.5 shrink-0 text-accent-400" />
              <a href={site.phoneHref} className="font-semibold text-fg hover:text-accent-300">
                {site.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <Icon name="mail" size={18} className="mt-0.5 shrink-0 text-accent-400" />
              <a href={`mailto:${site.email}`} className="hover:text-accent-300">
                {site.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-accent-400" />
              <span>{site.address}</span>
            </li>
            <li className="flex gap-3">
              <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-accent-400" />
              <span>
                {site.hours.map((h) => (
                  <span key={h} className="block">
                    {h}
                  </span>
                ))}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-3 py-6 text-[13px] text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-fg">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-fg">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
