import type { ReactNode } from 'react'
import { SmartImage } from './SmartImage'

interface Props {
  eyebrow?: string
  title: string
  lead?: string
  /** Optional photo under /images (e.g. "services/air-duct-cleaning.jpg") shown behind the header */
  image?: string
  children?: ReactNode
}

/** Banner for interior pages. */
export function PageHeader({ eyebrow, title, lead, image, children }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {image && (
        <div className="pointer-events-none absolute inset-0 -z-20">
          <SmartImage src={image} alt="" className="h-full w-full object-cover opacity-35" fallback={null} />
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/50" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-accent-400/20 blur-3xl" />
      <div className="container-x py-14 sm:py-20">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-lg text-fg-soft">{lead}</p>}
        {children}
      </div>
    </section>
  )
}
