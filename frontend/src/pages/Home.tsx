import { api } from '../lib/api'
import { useFetch, useSeo } from '../lib/hooks'
import { AreasPreview } from '../components/AreasPreview'
import { BeforeAfter } from '../components/BeforeAfter'
import { BlogPreview } from '../components/BlogPreview'
import { Button } from '../components/Button'
import { CTABanner } from '../components/CTABanner'
import { FAQ } from '../components/FAQ'
import { Hero } from '../components/Hero'
import { Icon } from '../components/Icon'
import { Process } from '../components/Process'
import { Promotions } from '../components/Promotions'
import { Section, SectionHeading } from '../components/Section'
import { ServiceCard, ServiceCardSkeleton } from '../components/ServiceCard'
import { Testimonials } from '../components/Testimonials'
import { TrustBar } from '../components/TrustBar'

export function Home() {
  useSeo(
    'CleanDuct | Chicago & Suburbs',
    'Professional air duct, dryer vent and chimney cleaning across Chicagoland. Upfront pricing, camera-verified results, 100% satisfaction guarantee.',
  )
  const { data: services } = useFetch(() => api.services({ featured: true }), 'services-featured')

  return (
    <>
      <Hero />
      <TrustBar />

      <Section id="services">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="What we do"
            title="Every part of your air system, cleaned properly"
            lead="From the furnace blower to the last register — plus dryer vents and chimneys."
            align="left"
          />
          <Button to="/services" variant="ghost">
            All services <Icon name="arrow" size={16} />
          </Button>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services ? services.map((s) => <ServiceCard key={s.id} service={s} />) : Array.from({ length: 4 }, (_, i) => <ServiceCardSkeleton key={i} />)}
        </div>
      </Section>

      <BeforeAfter />
      <Process />
      <Testimonials />
      <Promotions />
      <FAQ limit={6} />
      <AreasPreview />
      <BlogPreview />
      <CTABanner />
    </>
  )
}
