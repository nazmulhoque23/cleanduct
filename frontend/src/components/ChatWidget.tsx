import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSite } from '../lib/site-context'
import { track } from '../lib/analytics'
import { Icon } from './Icon'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const SESSION_KEY = 'cleanduct.chat.session'
const HISTORY_KEY = 'cleanduct.chat.history'

const suggestions = ['How much does duct cleaning cost?', 'Do you serve my area?', 'How do I book?', 'What are your hours?']

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('')
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'anon' + Date.now().toString(36)
  }
}

function loadHistory(): Msg[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as Msg[]) : []
  } catch {
    return []
  }
}

/** Floating assistant. Answers only questions about the business (enforced server-side). */
export function ChatWidget() {
  const site = useSite()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(loadHistory)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [unseen, setUnseen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-30)))
    } catch {
      /* ignore */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, open])

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  function toggle() {
    setOpen((o) => !o)
    setUnseen(false)
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    const next = [...msgs, { role: 'user' as const, content }]
    setMsgs(next)
    setInput('')
    setBusy(true)
    track('chat_message', { page: pathname })
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId(), page: pathname, messages: next.slice(-12) }),
      })
      const data = (await res.json()) as { reply?: string; error?: string }
      const reply = res.ok && data.reply ? data.reply : data.error ? data.error : `Sorry, I couldn't answer that just now. Call us at ${site.phone}.`
      setMsgs((m) => [...m, { role: 'assistant', content: reply }])
      if (!open) setUnseen(true)
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: `I'm having trouble connecting. Please call ${site.phone} or use /contact.` }])
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void send(input)
  }

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close chat' : 'Chat with us'}
        aria-expanded={open}
        className={`fixed right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-accent-400 text-bg shadow-glow transition-all hover:-translate-y-0.5 hover:bg-accent-300 lg:right-6 ${
          open ? 'bottom-[calc(1rem+env(safe-area-inset-bottom))] lg:bottom-6' : 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6'
        }`}
      >
        <Icon name={open ? 'close' : 'chat'} size={24} />
        {unseen && !open && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-red-400 ring-2 ring-bg" />}
      </button>

      {/* Panel */}
      <div
        role="dialog"
        aria-label="CleanDuct assistant"
        className={`fixed right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl bg-surface shadow-lift ring-1 ring-line-strong transition-all duration-200 lg:right-6 ${
          open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        } bottom-[calc(5rem+env(safe-area-inset-bottom))] max-h-[min(36rem,calc(100dvh-7rem))] lg:bottom-24`}
      >
        <div className="flex items-center gap-3 border-b border-line bg-bg-2 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-400/15 text-accent-300 ring-1 ring-accent-400/30">
            <Icon name="wind" size={18} />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="font-display text-[15px] font-bold text-fg">CleanDuct assistant</p>
            <p className="text-[11.5px] text-fg-muted">Services, pricing, areas &amp; booking · not for emergencies</p>
          </div>
          <a href={site.phoneHref} className="grid h-9 w-9 place-items-center rounded-full bg-tint/[0.06] text-accent-400 ring-1 ring-line-strong" aria-label="Call us">
            <Icon name="phone" size={16} />
          </a>
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {msgs.length === 0 && (
            <div className="space-y-3">
              <Bubble role="assistant">Hi! I can answer questions about our services, prices, service areas, hours and booking. What can I help with?</Bubble>
              <div className="flex flex-wrap gap-1.5 pl-1">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)} className="rounded-full bg-tint/[0.05] px-3 py-1.5 text-xs font-medium text-fg-soft ring-1 ring-inset ring-line transition hover:text-fg hover:ring-accent-400/50">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <Bubble key={i} role={m.role}>
              {m.content}
            </Bubble>
          ))}
          {busy && (
            <div className="flex items-center gap-1.5 pl-1 text-fg-muted">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-400" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-400 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-400 [animation-delay:240ms]" />
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-line p-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about services, pricing, booking…"
              maxLength={1200}
              className="min-w-0 flex-1 rounded-full border border-line-strong bg-tint/[0.04] px-4 py-2.5 text-[14.5px] text-fg placeholder:text-fg-muted/70 focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-400/15"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-400 text-bg transition disabled:opacity-40">
              <Icon name="arrow" size={18} />
            </button>
          </div>
          <p className="mt-2 px-1 text-[11px] text-fg-muted">
            Answers come from our site info only. For a quote, use{' '}
            <Link to="/contact" className="text-accent-300">
              /contact
            </Link>{' '}
            or{' '}
            <Link to="/book" className="text-accent-300">
              book online
            </Link>
            .
          </p>
        </form>
      </div>
    </>
  )
}

/** Renders a message; relative links like /book become real links. */
function Bubble({ role, children }: { role: 'user' | 'assistant'; children: string }) {
  const user = role === 'user'
  return (
    <div className={`flex ${user ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-relaxed ${user ? 'rounded-br-md bg-accent-400 text-bg' : 'rounded-bl-md bg-tint/[0.06] text-fg ring-1 ring-inset ring-line'}`}>
        {linkify(children)}
      </div>
    </div>
  )
}

const linkRe = /(\/(?:book|contact|services|service-areas|reviews|about|blog)(?:\/[a-z0-9-]+)?)/g

function linkify(text: string) {
  const parts = text.split(linkRe)
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <Link key={i} to={p} className="font-semibold underline decoration-accent-400/60 underline-offset-2">
        {p}
      </Link>
    ) : (
      p
    ),
  )
}
