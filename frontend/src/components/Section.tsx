import type { ReactNode } from 'react'

interface SectionProps {
  children: ReactNode
  className?: string
  id?: string
  /** default = base background; raised = slightly lighter panel with a hairline top ('white' kept as an alias) */
  tone?: 'default' | 'raised' | 'white'
}

export function Section({ children, className = '', id, tone = 'default' }: SectionProps) {
  const raised = tone !== 'default'
  return (
    <section id={id} className={`relative py-16 sm:py-20 lg:py-24 ${raised ? 'bg-bg-2' : ''} ${className}`}>
      {raised && <div className="hairline absolute inset-x-0 top-0" />}
      <div className="container-x">{children}</div>
    </section>
  )
}

interface HeadingProps {
  eyebrow?: string
  title: string
  lead?: string
  align?: 'left' | 'center'
  light?: boolean
  className?: string
}

export function SectionHeading({ eyebrow, title, lead, align = 'center', className = '' }: HeadingProps) {
  const alignCls = align === 'center' ? 'mx-auto text-center' : ''
  return (
    <div className={`max-w-2xl ${alignCls} ${className}`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-3xl font-bold sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">{title}</h2>
      {lead && <p className="mt-4 text-lg text-fg-muted">{lead}</p>}
    </div>
  )
}
