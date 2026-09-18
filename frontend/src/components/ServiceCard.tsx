import { Link } from 'react-router-dom'
import type { Service } from '../lib/api'
import { Icon } from './Icon'

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      to={`/services/${service.slug}`}
      className="group card relative flex flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent-400/0 blur-2xl transition-colors duration-300 group-hover:bg-accent-400/20" />
      <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-accent-400/10 text-accent-300 ring-1 ring-inset ring-accent-400/20 transition-all duration-300 group-hover:bg-accent-400 group-hover:text-bg group-hover:shadow-glow">
        <Icon name={service.icon} size={24} />
      </span>
      <h3 className="relative mt-5 text-lg font-bold">{service.name}</h3>
      <p className="relative mt-2 flex-1 text-[15px] leading-relaxed text-fg-muted">{service.shortDesc}</p>
      <div className="relative mt-5 flex items-center justify-between border-t border-line pt-4">
        <span className="text-sm font-semibold text-fg-soft">
          {service.startingAt ? (
            <>
              From <span className="text-fg">${service.startingAt}</span>
            </>
          ) : (
            'Custom quote'
          )}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-400 transition-transform group-hover:translate-x-1">
          Learn more <Icon name="arrow" size={16} />
        </span>
      </div>
    </Link>
  )
}

export function ServiceCardSkeleton() {
  return (
    <div className="card animate-pulse p-6">
      <div className="h-12 w-12 rounded-xl bg-surface-3" />
      <div className="mt-5 h-5 w-2/3 rounded bg-surface-3" />
      <div className="mt-3 h-4 w-full rounded bg-surface-2" />
      <div className="mt-2 h-4 w-5/6 rounded bg-surface-2" />
    </div>
  )
}
