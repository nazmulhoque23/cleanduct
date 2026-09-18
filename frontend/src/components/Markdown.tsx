import { Fragment, type ReactNode } from 'react'

/**
 * Tiny, dependency-free renderer for the subset of Markdown used in blog
 * posts: ## / ### headings, paragraphs, "- " bullet lists, **bold**.
 * Swap for react-markdown if posts ever need more.
 */
export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/)
  return (
    <div className={`prose-post ${className}`}>
      {blocks.map((block, i) => {
        const b = block.trim()
        if (!b) return null
        if (b.startsWith('### ')) return <h3 key={i}>{inline(b.slice(4))}</h3>
        if (b.startsWith('## ')) return <h2 key={i}>{inline(b.slice(3))}</h2>
        if (b.split('\n').every((l) => l.startsWith('- '))) {
          return (
            <ul key={i}>
              {b.split('\n').map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{inline(b)}</p>
      })}
    </div>
  )
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>,
  )
}
