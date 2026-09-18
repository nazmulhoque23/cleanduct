import { useSeo } from '../lib/hooks'
import { useSite } from '../lib/site-context'
import { FAQ } from '../components/FAQ'
import { Icon } from '../components/Icon'
import { LeadForm } from '../components/LeadForm'
import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'

export function Contact() {
  const site = useSite()
  useSeo(`Contact & Free Quote | ${site.name}`, 'Request a free duct cleaning quote online or call us. Same-week appointments across Chicagoland.')

  return (
    <>
      <PageHeader eyebrow="Contact" title="Get a free quote" lead="Fill out the form and we'll call, text or email within one business hour. Prefer to talk? We pick up." />
      <Section>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <LeadForm />
          </div>
          <aside className="space-y-4 lg:col-span-5">
            <a href={site.phoneHref} className="card flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-400 text-bg shadow-glow">
                <Icon name="phone" size={22} />
              </span>
              <span>
                <span className="block text-sm text-fg-muted">Call or text</span>
                <span className="block font-display text-xl font-bold text-fg">{site.phone}</span>
              </span>
            </a>
            <a href={`mailto:${site.email}`} className="card flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-400/10 text-accent-300 ring-1 ring-inset ring-accent-400/20">
                <Icon name="mail" size={22} />
              </span>
              <span>
                <span className="block text-sm text-fg-muted">Email</span>
                <span className="block font-semibold text-fg">{site.email}</span>
              </span>
            </a>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-400/10 text-accent-300 ring-1 ring-inset ring-accent-400/20">
                  <Icon name="clock" size={22} />
                </span>
                <span className="font-display font-bold text-fg">Hours</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-[15px] text-fg-soft">
                {site.hours.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-400/10 text-accent-300 ring-1 ring-inset ring-accent-400/20">
                  <Icon name="pin" size={22} />
                </span>
                <span className="font-display font-bold text-fg">Office</span>
              </div>
              <p className="mt-4 text-[15px] text-fg-soft">{site.address}</p>
              <p className="mt-1 text-sm text-fg-muted">Schaumburg office, by appointment — our crews come to you.</p>
            </div>
          </aside>
        </div>
      </Section>
      <FAQ />
    </>
  )
}
