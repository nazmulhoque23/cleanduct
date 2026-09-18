import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useFetch, useScrollTop, useSeo } from '../lib/hooks'
import { useSite } from '../lib/site-context'
import { PostCard } from '../components/BlogPreview'
import { CTABanner } from '../components/CTABanner'
import { Icon } from '../components/Icon'
import { LeadForm } from '../components/LeadForm'
import { Markdown } from '../components/Markdown'
import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'
import { NotFound } from './NotFound'

export function Blog() {
  useSeo('Tips & Advice | CleanDuct', 'Practical advice on indoor air quality, dryer vent safety and HVAC maintenance from Chicagoland duct cleaning pros.')
  const { data } = useFetch(api.posts, 'posts')
  return (
    <>
      <PageHeader eyebrow="Tips & advice" title="Cleaner air, explained" lead="No-nonsense articles on indoor air quality, safety and maintenance." />
      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((p, i) => (
            <PostCard key={p.id} post={p} hue={i} />
          ))}
        </div>
      </Section>
      <CTABanner />
    </>
  )
}

export function BlogPost() {
  const { slug = '' } = useParams()
  const site = useSite()
  useScrollTop(slug)
  const { data: post, error, loading } = useFetch(() => api.post(slug), `post-${slug}`)
  useSeo(post ? `${post.title} | ${site.name}` : site.name, post?.excerpt)

  if (error) return <NotFound />
  if (loading || !post) return <div className="container-x py-32 text-center text-fg-muted">Loading…</div>

  const date = new Date(post.publishedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <PageHeader image={`blog/${post.slug}.jpg`} eyebrow={`${post.category} · ${date} · ${post.readMinutes} min read`} title={post.title} lead={post.excerpt} />
      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <article className="lg:col-span-8">
            <Markdown source={post.body ?? ''} className="text-[17px]" />
            <Link to="/blog" className="mt-12 inline-flex items-center gap-2 font-semibold text-accent-300 hover:text-accent-200">
              <Icon name="arrow" size={16} className="rotate-180" /> Back to all articles
            </Link>
          </article>
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <LeadForm compact title="Think your ducts need a look?" />
            </div>
          </aside>
        </div>
      </Section>
    </>
  )
}
