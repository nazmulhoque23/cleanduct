import { api } from '../lib/api'
import { useFetch, useSeo } from '../lib/hooks'
import { useSite } from '../lib/site-context'
import { CTABanner } from '../components/CTABanner'
import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'
import { Stars } from '../components/Stars'

export function Reviews() {
  const site = useSite()
  useSeo(`Reviews | ${site.name}`, `${site.rating} stars from ${site.reviewCount} Chicagoland homeowners.`)
  const { data } = useFetch(api.testimonials, 'testimonials')

  return (
    <>
      <PageHeader eyebrow="Reviews" title={`${site.rating.toFixed(1)} stars. ${site.reviewCount.toLocaleString()} reviews.`} lead="Every review below is from a verified customer. We publish the 4-star ones too.">
        <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-white/[0.05] px-4 py-2 ring-1 ring-line-strong">
          <Stars rating={site.rating} size={18} />
          <span className="text-sm text-fg-muted">Google Business Profile</span>
        </div>
      </PageHeader>
      <Section>
        <div className="columns-1 gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
          {(data ?? []).map((t) => (
            <figure key={t.id} className="card p-6">
              <div className="flex items-center justify-between">
                <Stars rating={t.rating} />
                <span className="text-xs text-fg-muted">{new Date(t.reviewedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
              </div>
              <blockquote className="mt-4 text-[15px] leading-relaxed text-fg-soft">“{t.quote}”</blockquote>
              <figcaption className="mt-4 border-t border-line pt-4 text-sm">
                <span className="font-semibold text-fg">{t.author}</span>
                <span className="text-fg-muted"> · {t.location}</span>
                <span className="mt-1 block text-xs text-fg-muted">{t.service}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>
      <CTABanner />
    </>
  )
}
