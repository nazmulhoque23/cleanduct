import { Icon } from './Icon'

const items = [
  { icon: 'shield', title: 'Licensed & insured', text: 'Fully bonded. Background-checked technicians.' },
  { icon: 'camera', title: 'Camera-verified', text: 'See inside your ducts before and after.' },
  { icon: 'tag', title: 'Flat-rate pricing', text: 'The price we quote is the price you pay.' },
  { icon: 'leaf', title: 'NADCA-trained', text: 'Industry-standard methods, hospital-grade sanitizer.' },
]

export function TrustBar() {
  return (
    <div className="relative z-10 -mt-6 pb-4">
      <div className="container-x">
        <ul className="grid gap-px overflow-hidden rounded-2xl bg-line shadow-lift ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <li key={it.title} className="group flex gap-4 bg-surface/95 p-5 backdrop-blur-xl transition-colors hover:bg-surface-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-400/10 text-accent-300 ring-1 ring-inset ring-accent-400/20 transition group-hover:bg-accent-400 group-hover:text-bg">
                <Icon name={it.icon} size={22} />
              </span>
              <div>
                <p className="font-display font-bold text-fg">{it.title}</p>
                <p className="mt-0.5 text-sm text-fg-muted">{it.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
