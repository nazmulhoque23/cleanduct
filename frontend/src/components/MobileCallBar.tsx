import { Link } from 'react-router-dom'
import { useSite } from '../lib/site-context'
import { Icon } from './Icon'

/** Sticky bottom bar on phones: the two actions that matter most. */
export function MobileCallBar() {
  const site = useSite()
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-line bg-bg/85 p-2 backdrop-blur-xl lg:hidden [padding-bottom:calc(0.5rem+env(safe-area-inset-bottom))]">
      <a href={site.phoneHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-tint/[0.08] font-semibold text-fg ring-1 ring-inset ring-line-strong">
        <Icon name="phone" size={18} className="text-accent-400" /> Call now
      </a>
      <Link to="/contact" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent-400 font-semibold text-bg shadow-glow">
        Free quote <Icon name="arrow" size={18} />
      </Link>
    </div>
  )
}
