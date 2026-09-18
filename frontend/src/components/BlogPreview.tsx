import { Link } from 'react-router-dom'
import { api, type Post } from '../lib/api'
import { useFetch } from '../lib/hooks'
import { Button } from './Button'
import { Icon } from './Icon'
import { Section, SectionHeading } from './Section'
import { SmartImage } from './SmartImage'

export function BlogPreview() {
  const { data } = useFetch(api.posts, 'posts')
  const posts = (data ?? []).slice(0, 3)
  return (
    <Section>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow="Tips & advice" title="From the blog" align="left" />
        <Button to="/blog" variant="ghost">
          All articles <Icon name="arrow" size={16} />
        </Button>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {posts.map((p, i) => (
          <PostCard key={p.id} post={p} hue={i} />
        ))}
      </div>
    </Section>
  )
}

const hues = ['from-accent-500/60 to-surface-2', 'from-glow-indigo/60 to-surface-2', 'from-emerald-500/50 to-surface-2']

export function PostCard({ post, hue = 0 }: { post: Post; hue?: number }) {
  const date = new Date(post.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <Link to={`/blog/${post.slug}`} className="group card flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lift">
      <div className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${hues[hue % hues.length]}`}>
        <SmartImage
          src={`blog/${post.slug}.jpg`}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          fallback={<Icon name="wind" size={72} className="absolute bottom-4 right-4 text-white/15 transition-transform group-hover:scale-110" />}
        />
        <span className="absolute left-4 top-4 rounded-full bg-bg/80 px-2.5 py-1 text-xs font-semibold text-fg ring-1 ring-line-strong backdrop-blur">{post.category}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs text-fg-muted">
          {date} · {post.readMinutes} min read
        </p>
        <h3 className="mt-2 text-lg font-bold leading-snug transition-colors group-hover:text-accent-300">{post.title}</h3>
        <p className="mt-2 flex-1 text-[15px] leading-relaxed text-fg-muted">{post.excerpt}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-400">
          Read article <Icon name="arrow" size={16} />
        </span>
      </div>
    </Link>
  )
}
