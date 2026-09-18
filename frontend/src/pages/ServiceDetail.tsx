import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useFetch, useScrollTop, useSeo } from '../lib/hooks'
import { useSite } from '../lib/site-context'
import { Button } from '../components/Button'
import { FAQ } from '../components/FAQ'
import { Icon } from '../components/Icon'
import { LeadForm } from '../components/LeadForm'
import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'
import { Testimonials } from '../components/Testimonials'
import { NotFound } from './NotFound'

const included = [
  'Camera inspection before and after',
  'All supply & return runs and main trunk lines',
  'Register covers removed, washed and re-seated',
  'Blower compartment and accessible coil surface',
  'Photo report emailed same day',
  '100% satisfaction guarantee',
]

export function ServiceDetail() {
  const { slug = '' } = useParams()
  const site = useSite()
  useScrollTop(slug)
  const { data: service, error, loading } = useFetch(() => api.service(slug), `service-${slug}`)
  const { data: all } = useFetch(() => api.services(), 'services-all')
  useSeo(service ? `${service.name} | ${site.name}` : site.name, service?.shortDesc)

  if (error) return <NotFound />
  if (loading || !service) return <div className="container-x py-32 text-center text-fg-muted">Loading…</div>

  const related = (all ?? []).filter((s) => s.slug !== service.slug && s.category === service.category).slice(0, 3)

  return (
    <>
      <PageHeader image={`services/${service.slug}.jpg`} eyebrow={service.category === 'commercial' ? 'Commercial service' : 'Residential service'} title={service.name} lead={service.shortDesc}>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button to="/contact" size="lg">
            Get a free quote <Icon name="arrow" size={18} />
          </Button>
          <Button href={site.phoneHref} variant="secondary" size="lg">
            <Icon name="phone" size={18} className="text-accent-400" /> {site.phone}
          </Button>
        </div>
      </PageHeader>

      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <article className="lg:col-span-7">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-400/10 text-accent-300 ring-1 ring-inset ring-accent-400/25">
                <Icon name={service.icon} size={28} />
              </span>
              <div>
                <p className="text-sm text-fg-muted">Starting at</p>
                <p className="font-display text-2xl font-extrabold text-gradient">{service.startingAt ? `$${service.startingAt}` : 'Custom quote'}</p>
              </div>
            </div>
            <h2 className="mt-8 text-2xl font-bold">How we do it</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-fg-soft">{service.longDesc}</p>

            <h2 className="mt-10 text-2xl font-bold">What's included</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {included.map((i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] text-fg-soft">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-400/15 text-accent-300 ring-1 ring-inset ring-accent-400/30">
                    <Icon name="check" size={12} strokeWidth={3} />
                  </span>
                  {i}
                </li>
              ))}
            </ul>

            {related.length > 0 && (
              <>
                <h2 className="mt-12 text-2xl font-bold">Often booked together</h2>
                <ul className="card mt-4 divide-y divide-line overflow-hidden">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link to={`/services/${r.slug}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-2">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-400/10 text-accent-300 ring-1 ring-inset ring-accent-400/20">
                          <Icon name={r.icon} size={20} />
                        </span>
                        <span className="flex-1">
                          <span className="block font-semibold text-fg">{r.name}</span>
                          <span className="block text-sm text-fg-muted">{r.startingAt ? `From $${r.startingAt}` : 'Custom quote'}</span>
                        </span>
                        <Icon name="arrow" size={18} className="text-fg-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>

          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <LeadForm title={`Quote for ${service.name.toLowerCase()}`} />
            </div>
          </aside>
        </div>
      </Section>

      <Testimonials limit={6} />
      <FAQ limit={5} />
    </>
  )
}
