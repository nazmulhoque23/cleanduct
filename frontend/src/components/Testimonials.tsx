import { useEffect, useRef, useState } from 'react'
import { api, type Testimonial } from '../lib/api'
import { useFetch } from '../lib/hooks'
import { useSite } from '../lib/site-context'
import { Button } from './Button'
import { Icon } from './Icon'
import { Section, SectionHeading } from './Section'
import { Stars } from './Stars'

export function Testimonials({ limit = 6, showLink = true }: { limit?: number; showLink?: boolean }) {
  const site = useSite()
  const { data } = useFetch(api.testimonials, 'testimonials')
  const items = (data ?? []).slice(0, limit)
  const scroller = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null
      if (!card) return
      const w = card.getBoundingClientRect().width + 20
      setIdx(Math.round(el.scrollLeft / w))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [items.length])

  function go(delta: number) {
    const el = scroller.current
    const card = el?.firstElementChild as HTMLElement | null
    if (!el || !card) return
    el.scrollBy({ left: delta * (card.getBoundingClientRect().width + 20), behavior: 'smooth' })
  }

  return (
    <Section tone="raised" className="overflow-hidden">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-glow-indigo/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-accent-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading
          eyebrow="Reviews"
          title="Chicagoland homeowners trust us"
          lead={`${site.rating.toFixed(1)} average from ${site.reviewCount.toLocaleString()} verified Google reviews.`}
          align="left"
        />
        <div className="flex gap-2">
          <button onClick={() => go(-1)} className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] text-fg ring-1 ring-line-strong transition hover:bg-accent-400 hover:text-bg" aria-label="Previous review">
            <Icon name="arrow" size={18} className="rotate-180" />
          </button>
          <button onClick={() => go(1)} className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] text-fg ring-1 ring-line-strong transition hover:bg-accent-400 hover:text-bg" aria-label="Next review">
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="relative -mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {items.length === 0
          ? Array.from({ length: 3 }, (_, i) => <div key={i} className="h-64 w-[85%] shrink-0 animate-pulse snap-start rounded-2xl bg-surface sm:w-[46%] lg:w-[31.5%]" />)
          : items.map((t) => <Card key={t.id} t={t} />)}
      </div>

      <div className="relative mt-6 flex items-center justify-between">
        <div className="flex gap-1.5">
          {items.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-accent-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>
        {showLink && (
          <Button to="/reviews" variant="secondary" size="sm">
            Read all reviews
          </Button>
        )}
      </div>
    </Section>
  )
}

function Card({ t }: { t: Testimonial }) {
  const date = new Date(t.reviewedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  return (
    <figure className="card relative flex w-[85%] shrink-0 snap-start flex-col p-6 sm:w-[46%] lg:w-[31.5%]">
      <Icon name="quote" size={40} className="absolute right-5 top-4 text-accent-400/15" />
      <div className="flex items-center justify-between">
        <Stars rating={t.rating} />
        <span className="text-xs font-medium text-fg-muted">{t.source}</span>
      </div>
      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-fg-soft">“{t.quote}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent-400 to-glow-indigo font-display text-sm font-bold text-bg">
          {t.author.split(' ').map((p) => p[0]).join('').slice(0, 2)}
        </span>
        <span className="leading-tight">
          <span className="block font-semibold text-fg">{t.author}</span>
          <span className="block text-xs text-fg-muted">
            {t.location} · {t.service} · {date}
          </span>
        </span>
      </figcaption>
    </figure>
  )
}
