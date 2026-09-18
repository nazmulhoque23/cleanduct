import { useSeo } from '../lib/hooks'
import { useSite } from '../lib/site-context'
import { CTABanner } from '../components/CTABanner'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { Process } from '../components/Process'
import { Section, SectionHeading } from '../components/Section'
import { Testimonials } from '../components/Testimonials'

const values = [
  { icon: 'camera', title: 'Show, don’t tell', text: 'Every job starts and ends with a camera in the duct. You see what we see.' },
  { icon: 'tag', title: 'The quote is the price', text: 'No “technician discovered” surcharges. Add-ons are offered, never pushed.' },
  { icon: 'shield', title: 'Own the outcome', text: 'Not happy? We come back and make it right — free. That’s the whole guarantee.' },
  { icon: 'leaf', title: 'Do it the right way', text: 'NADCA methods, HEPA filtration and EPA-registered products only.' },
]

const badges = ['NADCA Member', 'BBB A+ Rated', 'EPA-Registered Products', 'Licensed & Bonded', 'Background-Checked Crews', 'Google Guaranteed']

export function About() {
  const site = useSite()
  useSeo(`About | ${site.name}`, `Family-owned duct cleaning company serving Chicagoland since ${site.yearFounded}.`)
  const years = new Date().getFullYear() - site.yearFounded

  return (
    <>
      <PageHeader eyebrow="About us" title="A local crew that treats your home like their own" lead={`Family-owned and Schaumburg-based since ${site.yearFounded}. ${site.reviewCount.toLocaleString()}+ reviews later, we still answer the phone ourselves.`} />

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our story" title="Started with one van and a lot of dusty vents" align="left" />
            <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-fg-soft">
              <p>
                CleanDuct began in {site.yearFounded} when our founder — an HVAC tech tired of watching customers get upsold on
                “mold” they didn’t have — bought a used truck-mounted vacuum and started doing the job honestly.
              </p>
              <p>
                Today we run four trucks out of Schaumburg across all of Chicagoland, but the rule hasn’t changed: inspect first, quote clearly, clean
                thoroughly and prove it with the camera. If a system doesn’t need cleaning, we tell you.
              </p>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-4">
              {[
                [`${years}+`, 'years in business'],
                ['4', 'trucks on the road'],
                ['31k+', 'homes cleaned'],
              ].map(([n, t]) => (
                <div key={t} className="card p-4 text-center">
                  <dt className="font-display text-3xl font-extrabold text-gradient">{n}</dt>
                  <dd className="mt-1 text-xs text-fg-muted">{t}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-400/10 text-accent-300 ring-1 ring-inset ring-accent-400/20">
                  <Icon name={v.icon} size={22} />
                </span>
                <h3 className="mt-4 text-lg font-bold">{v.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <section className="border-y border-line bg-bg-2 py-10">
        <div className="container-x">
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {badges.map((b) => (
              <li key={b} className="inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-fg-muted">
                <Icon name="check" size={16} className="text-accent-400" strokeWidth={3} /> {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Process />
      <Testimonials />
      <CTABanner />
    </>
  )
}
