import { useRef, useState } from 'react'
import { Section, SectionHeading } from './Section'
import { SmartImage } from './SmartImage'

/**
 * Interactive before/after comparison. Uses public/images/before.jpg and
 * after.jpg when present; stylised SVG duct interiors until then.
 */
export function BeforeAfter() {
  const [pos, setPos] = useState(52)
  const ref = useRef<HTMLDivElement>(null)

  function move(clientX: number) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }

  return (
    <Section tone="raised">
      <SectionHeading
        eyebrow="See the difference"
        title="You'd be surprised what's hiding in your ducts"
        lead="Drag the slider. This is a typical single-family home that hadn't been cleaned in about six years."
      />

      <div
        ref={ref}
        className="relative mx-auto mt-12 aspect-[16/9] max-w-4xl cursor-ew-resize touch-none select-none overflow-hidden rounded-3xl shadow-lift ring-1 ring-line-strong"
        onPointerMove={(e) => e.buttons === 1 && move(e.clientX)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e.clientX)
        }}
        role="slider"
        aria-label="Before and after comparison"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 4))
          if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 4))
        }}
      >
        {/* After (base layer) */}
        <div className="absolute inset-0">
          <SmartImage src="after.jpg" alt="Clean air duct after service" className="h-full w-full object-cover" fallback={<DuctArt variant="after" />} />
        </div>
        <Label side="right" text="After" />

        {/* Before (clipped) */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <SmartImage src="before.jpg" alt="Dusty air duct before service" className="h-full w-full object-cover" fallback={<DuctArt variant="before" />} />
          <Label side="left" text="Before" />
        </div>

        {/* Handle */}
        <div className="absolute inset-y-0 w-0.5 bg-accent-400 shadow-[0_0_12px_rgb(34_211_238/0.8)]" style={{ left: `${pos}%` }}>
          <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent-400 text-bg shadow-glow">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 7-5 5 5 5m6-10 5 5-5 5" />
            </svg>
          </span>
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl gap-4 text-center sm:grid-cols-3">
        {[
          ['12–40 lbs', 'of dust removed from a typical home'],
          ['Up to 20%', 'lower HVAC energy use after cleaning'],
          ['2–4 hrs', 'for a standard single-furnace home'],
        ].map(([n, t]) => (
          <div key={n} className="card p-5">
            <p className="font-display text-3xl font-extrabold text-gradient">{n}</p>
            <p className="mt-1 text-sm text-fg-muted">{t}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

function Label({ side, text }: { side: 'left' | 'right'; text: string }) {
  return (
    <span className={`absolute top-4 rounded-full bg-bg/70 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fg ring-1 ring-line-strong backdrop-blur ${side === 'left' ? 'left-4' : 'right-4'}`}>
      {text}
    </span>
  )
}

/** Stylised duct-interior illustration (placeholder for real photos). */
function DuctArt({ variant }: { variant: 'before' | 'after' }) {
  const dirty = variant === 'before'
  const wall = dirty ? '#5d554b' : '#aeb9c8'
  const wallDark = dirty ? '#2e2a25' : '#5f6d80'
  const end = dirty ? '#120f0c' : '#1b2536'
  return (
    <svg viewBox="0 0 800 450" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${variant}-tube`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={wallDark} />
          <stop offset="0.5" stopColor={wall} />
          <stop offset="1" stopColor={wallDark} />
        </linearGradient>
        <radialGradient id={`${variant}-end`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={end} />
          <stop offset="1" stopColor={wallDark} />
        </radialGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.35" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="800" height="450" fill={`url(#${variant}-tube)`} />
      {Array.from({ length: 9 }, (_, i) => {
        const s = 1 - i * 0.09
        return (
          <rect
            key={i}
            x={400 - 400 * s}
            y={225 - 225 * s}
            width={800 * s}
            height={450 * s}
            rx={40 * s}
            fill="none"
            stroke={dirty ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)'}
            strokeWidth={dirty ? 6 : 3}
          />
        )
      })}
      <rect x="290" y="160" width="220" height="130" rx="14" fill={`url(#${variant}-end)`} />
      {dirty && (
        <>
          <rect width="800" height="450" filter="url(#grain)" opacity="0.9" />
          {[
            [60, 380, 90, 34], [190, 405, 120, 28], [520, 395, 140, 32], [690, 372, 80, 30],
            [40, 60, 70, 22], [700, 50, 90, 24], [330, 300, 60, 18], [440, 305, 50, 16],
          ].map(([x, y, w, h], i) => (
            <ellipse key={i} cx={x} cy={y} rx={w} ry={h} fill="#1e1a15" opacity="0.9" />
          ))}
        </>
      )}
      {!dirty && <ellipse cx="400" cy="90" rx="380" ry="60" fill="#22d3ee" opacity="0.16" />}
    </svg>
  )
}
