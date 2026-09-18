import { useSite } from '../lib/site-context'
import { Button } from './Button'
import { Icon } from './Icon'
import { LeadForm } from './LeadForm'
import { SmartImage } from './SmartImage'
import { Stars } from './Stars'

const bullets = ['Camera-verified before & after', 'Upfront flat-rate pricing', 'Licensed, bonded & NADCA-trained']

export function Hero() {
  const site = useSite()
  return (
    <section className="relative isolate overflow-hidden">
      {/* Photo slot (public/images/hero.jpg) with dark gradient overlay; SVG scene until then */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        <SmartImage src="hero.jpg" alt="" className="h-full w-full object-cover opacity-40" fallback={<HeroScene />} />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/60" />
      </div>
      {/* Ambient glows + grid */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="animate-drift pointer-events-none absolute -left-40 top-10 -z-10 h-[36rem] w-[36rem] rounded-full bg-accent-400/20 blur-[120px]" />
      <div className="animate-drift pointer-events-none absolute -bottom-40 right-[-8rem] -z-10 h-[34rem] w-[34rem] rounded-full bg-glow-indigo/25 blur-[120px] [animation-delay:-9s]" />

      <div className="container-x grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-7">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[13px] font-medium text-fg-soft ring-1 ring-inset ring-line-strong backdrop-blur">
            <Stars rating={site.rating} size={14} />
            <span>
              Rated {site.rating.toFixed(1)} by {site.reviewCount.toLocaleString()}+ Chicagoland homeowners
            </span>
          </p>
          <h1 className="animate-fade-up delay-100 mt-6 text-4xl font-extrabold leading-[1.04] sm:text-5xl lg:text-[4rem]">
            Breathe easier with <span className="text-gradient">professionally cleaned</span> air ducts.
          </h1>
          <p className="animate-fade-up delay-200 mt-6 max-w-xl text-lg leading-relaxed text-fg-soft">
            We remove years of dust, dander and allergens from your entire HVAC system — and show you the proof on camera.
            Same-week appointments across Chicago and the suburbs.
          </p>

          <ul className="animate-fade-up delay-300 mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-[15px] text-fg">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-400/15 text-accent-300 ring-1 ring-inset ring-accent-400/30">
                  <Icon name="check" size={12} strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="animate-fade-up delay-400 mt-9 flex flex-col gap-3 sm:flex-row">
            <Button to="/contact" size="lg">
              Book online <Icon name="arrow" size={18} />
            </Button>
            <Button href={site.phoneHref} variant="secondary" size="lg">
              <Icon name="phone" size={18} className="text-accent-400" /> {site.phone}
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px] text-fg-muted">
            <span className="flex items-center gap-2"><Icon name="shield" size={16} className="text-accent-400" /> 100% satisfaction guarantee</span>
            <span className="flex items-center gap-2"><Icon name="clock" size={16} className="text-accent-400" /> Since {site.yearFounded}</span>
            <span className="flex items-center gap-2"><Icon name="camera" size={16} className="text-accent-400" /> Photo report with every job</span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <LeadForm compact title="Get a free quote in 60 seconds" className="animate-fade-up delay-200" />
        </div>
      </div>
    </section>
  )
}

/** Abstract "airflow through a duct" scene used until hero.jpg exists. */
function HeroScene() {
  return (
    <svg className="h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hs-a" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#0f1829" />
          <stop offset="1" stopColor="#070b14" />
        </linearGradient>
        <linearGradient id="hs-line" x1="0" x2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="0.5" stopColor="#22d3ee" stopOpacity="0.9" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#hs-a)" />
      {Array.from({ length: 14 }, (_, i) => {
        const y = 120 + i * 52
        const amp = 30 + (i % 4) * 12
        return (
          <path
            key={i}
            d={`M-100 ${y} C 400 ${y - amp}, 800 ${y + amp}, 1700 ${y - amp / 2}`}
            fill="none"
            stroke="url(#hs-line)"
            strokeWidth={1.2}
            opacity={0.25 + (i % 3) * 0.15}
          />
        )
      })}
      {Array.from({ length: 7 }, (_, i) => {
        const s = 1 - i * 0.12
        return <rect key={i} x={1000 - 320 * s} y={450 - 260 * s} width={640 * s} height={520 * s} rx={60 * s} fill="none" stroke="#22d3ee" strokeOpacity={0.08 + i * 0.03} strokeWidth={1.5} />
      })}
    </svg>
  )
}
