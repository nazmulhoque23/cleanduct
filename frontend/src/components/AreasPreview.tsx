import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useFetch } from '../lib/hooks'
import { Button } from './Button'
import { Icon } from './Icon'
import { Section, SectionHeading } from './Section'

export function AreasPreview() {
  const { data } = useFetch(api.serviceAreas, 'areas')
  const areas = data ?? []

  return (
    <Section tone="raised">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Service areas"
            title="Based in Schaumburg. Serving Chicago and 40+ suburbs."
            lead="Cook, Lake, DuPage and Kane counties. Don't see your town? Call — we probably still come to you."
            align="left"
          />
          <ul className="mt-8 flex flex-wrap gap-2">
            {areas.slice(0, 18).map((a) => (
              <li key={a.id}>
                <Link
                  to={`/service-areas/${a.slug}`}
                  className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-all ${
                    a.featured ? 'bg-accent-400/10 text-accent-200 ring-accent-400/30 hover:bg-accent-400 hover:text-bg' : 'bg-white/[0.04] text-fg-soft ring-line hover:text-fg hover:ring-line-strong'
                  }`}
                >
                  <Icon name="pin" size={13} /> {a.city}
                </Link>
              </li>
            ))}
          </ul>
          <Button to="/service-areas" variant="ghost" className="mt-8">
            View all service areas <Icon name="arrow" size={16} />
          </Button>
        </div>

        <ServiceMap />
      </div>
    </Section>
  )
}

/** Stylised coverage map — decorative, not geographic. Replace with a Google Maps embed if desired. */
function ServiceMap() {
  const pins: [number, number][] = [
    [38, 46], [52, 58], [44, 38], [61, 30], [33, 50], [70, 62], [25, 70], [48, 22], [64, 76], [38, 82], [78, 44],
  ]
  return (
    <div className="card relative aspect-square overflow-hidden">
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="cov" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0.22" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <pattern id="dots" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.45" fill="rgba(255,255,255,0.12)" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#dots)" />
        <path d="M82 0 Q74 30 80 60 Q86 85 78 100 L100 100 L100 0 Z" fill="#22d3ee" fillOpacity="0.06" />
        <circle cx="45" cy="50" r="46" fill="url(#cov)" />
        <path d="M0 50 H80 M50 0 V100 M10 20 L75 85 M20 90 L70 15" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        {pins.map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="4" fill="#22d3ee" opacity="0.18">
              <animate attributeName="r" values="3;7;3" dur="3s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </circle>
            <circle r={i === 0 ? 2.4 : 1.7} fill={i === 0 ? '#22d3ee' : '#a5f3fc'} />
          </g>
        ))}
      </svg>
      <div className="absolute bottom-4 left-4 rounded-xl bg-bg/80 px-4 py-3 text-sm ring-1 ring-line-strong backdrop-blur">
        <p className="font-display font-bold text-fg">Home base: Schaumburg, IL</p>
        <p className="text-fg-muted">Up to 45 minutes each direction</p>
      </div>
    </div>
  )
}
