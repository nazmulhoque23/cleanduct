import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { adminApi, ApiError, type FieldSpec, type Row } from '../../lib/api'
import { useFetch } from '../../lib/hooks'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'

const titles: Record<string, string> = {
  services: 'Services',
  'service-areas': 'Service areas',
  promotions: 'Promotions',
  testimonials: 'Reviews',
  faqs: 'FAQs',
  posts: 'Blog posts',
}

// Friendly labels and help for fields whose key alone isn't self-explanatory.
const labels: Record<string, string> = {
  question: 'Question', answer: 'Answer', sortOrder: 'Order (lower shows first)', keywords: 'Chatbot trigger words',
  showOnSite: 'Show on the website FAQ list', shortDesc: 'Short description', longDesc: 'Full description (Markdown)',
  startingAt: 'Starting price ($)', zipCodes: 'ZIP codes', publishedAt: 'Publish date', reviewedAt: 'Review date',
  expiresAt: 'Expires', body: 'Body (Markdown)', neighborhoods: 'Neighborhoods', intro: 'Intro paragraph',
}
const help: Record<string, string> = {
  keywords: 'Comma-separated words a customer might type in the chat, e.g. "price, cost, how much". The chatbot answers with this FAQ when a message contains them. Every FAQ — shown on site or not — is available to the chatbot.',
  showOnSite: 'Untick to keep a question chatbot-only (handy for internal or very specific questions).',
  answer: 'Plain text. The chatbot sends this exact answer, so keep it short and friendly.',
  slug: 'URL part, lowercase with dashes. Leave blank to generate from the name.',
}
const intros: Record<string, string> = {
  faqs: 'These questions appear on the FAQ section of the site and power the chatbot: when a visitor types something matching a question or its trigger words, the bot replies with the answer.',
}

// Fields that read better as multi-line editors, and the ones to show in the list.
const longFields = new Set(['longDesc', 'shortDesc', 'body', 'excerpt', 'answer', 'quote', 'description', 'intro', 'blurb', 'neighborhoods'])
const listFields: Record<string, string[]> = {
  services: ['name', 'category', 'startingAt', 'featured'],
  'service-areas': ['city', 'zipCodes', 'featured'],
  promotions: ['title', 'badge', 'expiresAt', 'active'],
  testimonials: ['author', 'rating', 'reviewedAt', 'published'],
  faqs: ['question', 'sortOrder', 'showOnSite'],
  posts: ['title', 'category', 'publishedAt', 'published'],
}

export function ContentEditor({ token }: { token: string }) {
  const { resource = '' } = useParams()
  const api = adminApi(token)
  const [refresh, setRefresh] = useState(0)
  const { data: schema } = useFetch(() => api.schema(), 'schema')
  const { data: rows, loading } = useFetch(() => api.list(resource), `${resource}-${refresh}`)
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const fields = schema?.[resource] ?? []

  // Close any open editor when switching sections.
  const [lastResource, setLastResource] = useState(resource)
  if (resource !== lastResource) {
    setLastResource(resource)
    setEditing(null)
  }

  async function remove(id: number) {
    if (!confirm('Delete this item? This cannot be undone.')) return
    await api.remove(resource, id)
    setRefresh((n) => n + 1)
  }

  if (!titles[resource]) return <p className="text-fg-muted">Unknown section.</p>

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Content</p>
          <h1 className="mt-1 text-2xl font-bold">{titles[resource]}</h1>
          {intros[resource] && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{intros[resource]}</p>}
        </div>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Icon name="sparkles" size={16} /> Add new
        </Button>
      </div>

      {editing && (
        <EditForm
          key={editing === 'new' ? 'new' : editing.id}
          fields={fields}
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={async (body) => {
            if (editing === 'new') await api.create(resource, body)
            else await api.update(resource, editing.id, body)
            setEditing(null)
            setRefresh((n) => n + 1)
          }}
        />
      )}

      <div className="card mt-6 overflow-hidden">
        {loading && <p className="p-6 text-sm text-fg-muted">Loading…</p>}
        <ul className="divide-y divide-line">
          {(rows ?? []).map((r) => (
            <li key={r.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-fg">{String(r[listFields[resource][0]] ?? '')}</p>
                <p className="mt-0.5 truncate text-xs text-fg-muted">
                  {listFields[resource].slice(1).map((k) => `${k}: ${fmt(r[k])}`).join(' · ')}
                </p>
              </div>
              <button onClick={() => setEditing(r)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-accent-300 hover:bg-tint/[0.05]">
                Edit
              </button>
              <button onClick={() => remove(r.id)} className="rounded-lg px-3 py-1.5 text-sm text-fg-muted hover:bg-red-400/10 hover:text-red-300">
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function fmt(v: unknown) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  return String(v)
}

function EditForm({ fields, initial, onSave, onCancel }: { fields: FieldSpec[]; initial: Row | null; onSave: (b: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = {}
    for (const f of fields) v[f.key] = initial ? initial[f.key] : f.kind === 'bool' ? ['active', 'published', 'showOnSite'].includes(f.key) : ''
    return v
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setMsg('')
    try {
      const body: Record<string, unknown> = {}
      for (const f of fields) {
        const v = values[f.key]
        body[f.key] = f.kind === 'int' ? (v === '' || v === null ? null : Number(v)) : v
      }
      await onSave(body)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields ?? {})
        setMsg(err.fields ? 'Please fix the highlighted fields.' : err.message)
      } else setMsg('Save failed.')
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-lg border border-line-strong bg-tint/[0.04] px-3 py-2 text-sm text-fg focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-400/15'

  return (
    <form onSubmit={submit} className="card mt-6 p-5 sm:p-6">
      <h2 className="text-lg font-bold">{initial ? 'Edit' : 'New item'}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const long = longFields.has(f.key)
          const wrap = long ? 'sm:col-span-2' : ''
          const v = values[f.key]
          return (
            <label key={f.key} className={`block ${wrap}`}>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fg-muted">
                {labels[f.key] ?? f.key} {f.required && <span className="text-accent-400">*</span>}
              </span>
              {f.kind === 'bool' ? (
                <input type="checkbox" checked={!!v} onChange={(e) => setValues({ ...values, [f.key]: e.target.checked })} className="h-5 w-5 accent-accent-400" />
              ) : long ? (
                <textarea value={String(v ?? '')} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className={`${input} min-h-[120px] font-mono text-[13px]`} />
              ) : (
                <input
                  type={f.kind === 'int' ? 'number' : f.kind === 'date' ? 'date' : 'text'}
                  value={v === null || v === undefined ? '' : String(v)}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  className={input}
                />
              )}
              {help[f.key] && <span className="mt-1 block text-xs text-fg-muted">{help[f.key]}</span>}
              {errors[f.key] && <span className="mt-1 block text-xs text-red-400">{errors[f.key]}</span>}
            </label>
          )
        })}
      </div>
      {msg && <p className="mt-3 text-sm text-red-400">{msg}</p>}
      <div className="mt-5 flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
