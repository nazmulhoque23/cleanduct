import { api } from '../lib/api'
import { useFetch } from '../lib/hooks'
import { Button } from './Button'
import { Icon } from './Icon'
import { Section, SectionHeading } from './Section'

export function Promotions() {
  const { data } = useFetch(api.promotions, 'promotions')
  if (data && data.length === 0) return null

  return (
    <Section id="specials">
      <SectionHeading eyebrow="Current specials" title="Seasonal offers, no gimmicks" lead="Mention the code when you book. Offers can't be combined." />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {(data ?? []).map((p) => (
          <div key={p.id} className="group card relative overflow-hidden p-6 transition-all hover:-translate-y-1 hover:shadow-lift">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent-400/10 blur-2xl transition-all group-hover:bg-accent-400/25" />
            <span className="relative inline-block rounded-full bg-accent-400 px-3 py-1 font-display text-sm font-extrabold tracking-wide text-bg">{p.badge}</span>
            <h3 className="relative mt-4 text-xl font-bold">{p.title}</h3>
            <p className="relative mt-2 text-[15px] leading-relaxed text-fg-muted">{p.description}</p>
            <div className="relative mt-5 flex items-center justify-between border-t border-dashed border-line-strong pt-4 text-sm">
              <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-accent-300">
                <Icon name="tag" size={15} /> {p.code}
              </span>
              <span className="text-fg-muted">{p.expiresAt ? `Ends ${new Date(p.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Ongoing'}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Button to="/contact" size="lg">
          Claim an offer <Icon name="arrow" size={18} />
        </Button>
      </div>
    </Section>
  )
}
