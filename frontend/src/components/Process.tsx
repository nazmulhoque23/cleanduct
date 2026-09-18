import { Section, SectionHeading } from './Section'
import { Icon } from './Icon'

const steps = [
  { icon: 'camera', title: 'Inspect', text: 'We run a camera through your trunk line and show you exactly what we see — before quoting any extras.' },
  { icon: 'wind', title: 'Clean', text: 'Truck-mounted HEPA vacuum puts the whole system under negative pressure while brushes and air whips scrub every run.' },
  { icon: 'sparkles', title: 'Sanitize', text: 'Optional EPA-registered fogging kills mold, bacteria and odors. Safe for kids and pets.' },
  { icon: 'check', title: 'Verify', text: 'A second camera pass and a photo report in your inbox. Not happy? We come back free.' },
]

export function Process() {
  return (
    <Section>
      <SectionHeading eyebrow="How it works" title="Four steps. Zero surprises." lead="Most homes are done in an afternoon — and you'll know the price before we start." />
      <ol className="relative mt-14 grid gap-8 md:grid-cols-4">
        <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-accent-400/50 to-transparent md:block" />
        {steps.map((s, i) => (
          <li key={s.title} className="group relative">
            <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-surface text-accent-300 shadow-card ring-1 ring-line transition-all group-hover:ring-accent-400/50 group-hover:shadow-glow md:mx-0">
              <Icon name={s.icon} size={26} />
              <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-accent-400 font-display text-xs font-bold text-bg">{i + 1}</span>
            </div>
            <h3 className="mt-5 text-center text-xl font-bold md:text-left">{s.title}</h3>
            <p className="mt-2 text-center text-[15px] leading-relaxed text-fg-muted md:text-left">{s.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
