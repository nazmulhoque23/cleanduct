import { useSite } from '../lib/site-context'
import { Button } from './Button'
import { Icon } from './Icon'

export function CTABanner() {
  const site = useSite()
  return (
    <section className="container-x pb-16 sm:pb-20 lg:pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-surface px-6 py-14 text-center shadow-lift ring-1 ring-line sm:px-12">
        <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-accent-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-glow-indigo/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/70 to-transparent" />
        <p className="eyebrow relative justify-center">Ready for cleaner air?</p>
        <h2 className="relative mt-3 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
          Book your cleaning <span className="text-gradient">this week.</span>
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-fg-muted">Free quotes, flat-rate pricing and a crew that treats your home like their own.</p>
        <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to="/contact" size="lg">
            Get a free quote <Icon name="arrow" size={18} />
          </Button>
          <Button href={site.phoneHref} variant="secondary" size="lg">
            <Icon name="phone" size={18} className="text-accent-400" /> {site.phone}
          </Button>
        </div>
      </div>
    </section>
  )
}
