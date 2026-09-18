import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useFetch, useScrollTop, useSeo } from '../lib/hooks'
import { useSite } from '../lib/site-context'
import { Button } from '../components/Button'
import { CTABanner } from '../components/CTABanner'
import { Icon } from '../components/Icon'
import { LeadForm } from '../components/LeadForm'
import { PageHeader } from '../components/PageHeader'
import { Section, SectionHeading } from '../components/Section'
import { ServiceCard } from '../components/ServiceCard'
import { Testimonials } from '../components/Testimonials'
import { NotFound } from './NotFound'

export function ServiceAreas() {
  useSeo('Service Areas | CleanDuct', 'Air duct and dryer vent cleaning in Chicago and 40+ suburbs across Cook, Lake, DuPage and Kane counties.')
  const { data } = useFetch(api.serviceAreas, 'areas')
  const [q, setQ] = useState('')
  const areas = (data ?? []).filter((a) => a.city.toLowerCase().includes(q.toLowerCase()) || a.zipCodes.includes(q))

  return (
    <>
      <PageHeader eyebrow="Service areas" title="Chicago and 40+ suburbs" lead="Type your town or ZIP to check coverage. Don't see it? Call — we probably still come to you." />
      <Section>
        <label className="relative mx-auto block max-w-xl">
          <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by city or ZIP code"
            className="w-full rounded-full border border-line-strong bg-surface py-3.5 pl-12 pr-4 text-[15px] text-fg shadow-card placeholder:text-fg-muted focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-400/20"
          />
        </label>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((a) => (
            <li key={a.id}>
              <Link to={`/service-areas/${a.slug}`} className="card group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-400/10 text-accent-300 ring-1 ring-inset ring-accent-400/20 transition group-hover:bg-accent-400 group-hover:text-bg">
                  <Icon name="pin" size={18} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-fg">
                    {a.city}, {a.state}
                  </span>
                  <span className="block text-xs text-fg-muted">{a.zipCodes}</span>
                </span>
                <Icon name="arrow" size={16} className="text-fg-muted transition-transform group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
        {data && areas.length === 0 && (
          <p className="mt-10 text-center text-fg-muted">
            No match for “{q}” — but we may still serve you.{' '}
            <Link to="/contact" className="font-semibold text-accent-300 underline">
              Ask us.
            </Link>
          </p>
        )}
      </Section>
      <CTABanner />
    </>
  )
}

export function ServiceAreaDetail() {
  const { slug = '' } = useParams()
  const site = useSite()
  useScrollTop(slug)
  const { data: area, error, loading } = useFetch(() => api.serviceArea(slug), `area-${slug}`)
  const { data: services } = useFetch(() => api.services({ featured: true }), 'services-featured')
  useSeo(area ? `Air Duct Cleaning in ${area.city}, ${area.state} | ${site.name}` : site.name, area?.blurb)

  if (error) return <NotFound />
  if (loading || !area) return <div className="container-x py-32 text-center text-fg-muted">Loading…</div>

  return (
    <>
      <PageHeader eyebrow={`${area.city}, ${area.state} · ${area.zipCodes}`} title={`Air duct cleaning in ${area.city}`} lead={area.blurb}>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button to="/contact" size="lg">
            Book in {area.city} <Icon name="arrow" size={18} />
          </Button>
          <Button href={site.phoneHref} variant="secondary" size="lg">
            <Icon name="phone" size={18} className="text-accent-400" /> {site.phone}
          </Button>
        </div>
      </PageHeader>

      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionHeading eyebrow="Local service" title={`Why ${area.city} homeowners choose us`} align="left" />
            <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-fg-soft">
              {area.intro ? (
                <p>{area.intro}</p>
              ) : (
                <p>
                  Based just down the road in Schaumburg, we've been cleaning ducts in {area.city} and the surrounding neighborhoods since {site.yearFounded}.
                </p>
              )}
              <p>
                Every {area.city} job includes a camera inspection before and after, flat-rate pricing quoted up front, and a photo report
                emailed the same day. Same-week appointments are usually available.
              </p>
              {area.neighborhoods && (
                <p className="text-[15px] text-fg-muted">
                  <span className="font-semibold text-fg-soft">Neighborhoods we serve in {area.city}:</span> {area.neighborhoods}.
                </p>
              )}
            </div>
            <h3 className="mt-10 text-xl font-bold">Popular services in {area.city}</h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {(services ?? []).map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </div>
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <LeadForm title={`Free quote in ${area.city}`} />
            </div>
          </aside>
        </div>
      </Section>
      <Testimonials />
    </>
  )
}
