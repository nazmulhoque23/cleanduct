import { useState } from 'react'
import { useFetch } from '../../lib/hooks'
import { Icon } from '../../components/Icon'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}
interface ChatSession {
  sessionId: string
  page: string
  startedAt: string
  messages: ChatMsg[]
}

export function Chats({ token }: { token: string }) {
  const { data, loading } = useFetch(
    () =>
      fetch('/api/admin/chats', { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
        if (!r.ok) throw new Error('failed')
        return r.json() as Promise<ChatSession[]>
      }),
    'chats',
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const sessions = data ?? []

  return (
    <div>
      <p className="eyebrow">Assistant</p>
      <h1 className="mt-1 text-2xl font-bold">Chat transcripts</h1>
      <p className="mt-1 text-sm text-fg-muted">Read what customers ask to improve FAQs and service descriptions — the assistant answers only from that content.</p>

      <div className="card mt-6 overflow-hidden">
        {loading && <p className="p-6 text-sm text-fg-muted">Loading…</p>}
        {!loading && sessions.length === 0 && <p className="p-8 text-center text-sm text-fg-muted">No conversations yet.</p>}
        <ul className="divide-y divide-line">
          {sessions.map((s) => {
            const open = openId === s.sessionId
            const first = s.messages.find((m) => m.role === 'user')?.content ?? ''
            return (
              <li key={s.sessionId}>
                <button onClick={() => setOpenId(open ? null : s.sessionId)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-tint/[0.03]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-400/10 text-accent-300">
                    <Icon name="chat" size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-fg">{first || '(empty)'}</span>
                    <span className="block text-xs text-fg-muted">
                      {new Date(s.startedAt.replace(' ', 'T') + 'Z').toLocaleString()} · {s.messages.length} messages · from {s.page || '/'}
                    </span>
                  </span>
                  <Icon name="chevron" size={16} className={`text-fg-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="space-y-2 border-t border-line bg-bg-2 p-4">
                    {s.messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <p className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-accent-400 text-bg' : 'bg-tint/[0.06] text-fg ring-1 ring-inset ring-line'}`}>{m.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
