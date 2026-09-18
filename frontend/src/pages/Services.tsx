import { api } from '../lib/api'
import { useFetch, useSeo } from '../lib/hooks'
import { CTABanner } from '../components/CTABanner'
import { PageHeader } from '../components/PageHeader'
import { Section, SectionHeading } from '../components/Section'
import { ServiceCard, ServiceCardSkeleton } from '../components/ServiceCard'

export function Services() {
  useSeo('Services | CleanDuct', 'Air duct cleaning, dryer vent cleaning, chimney sweeps, UV purification, sanitizing and commercial service across Chicagoland.')
  const { data } = useFetch(() => api.services(), 'services-all')
  const residential = (data ?? []).filter((s) => s.category === 'residential')
  const commercial = (data ?? []).filter((s) => s.category === 'commercial')

  return (
    <>
      <PageHeader eyebrow="Services" title="Everything between the furnace and the register" lead="Flat-rate pricing for homes. Custom quotes for businesses. Camera-verified results either way." />
      <Section>
        <SectionHeading eyebrow="Residential" title="For your home" align="left" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data ? residential.map((s) => <ServiceCard key={s.id} service={s} />) : Array.from({ length: 6 }, (_, i) => <ServiceCardSkeleton key={i} />)}
        </div>
      </Section>
      <Section tone="raised">
        <SectionHeading eyebrow="Commercial" title="For your business" lead="Offices, clinics, restaurants, laundromats and multi-unit buildings. Nights and weekends available." align="left" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {commercial.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      </Section>
      <CTABanner />
    </>
  )
}
