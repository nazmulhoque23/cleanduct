import { useState } from 'react'
import { api } from '../lib/api'
import { useFetch } from '../lib/hooks'
import { Icon } from './Icon'
import { Section, SectionHeading } from './Section'

export function FAQ({ limit }: { limit?: number }) {
  const { data } = useFetch(api.faqs, 'faqs')
  const [open, setOpen] = useState<number | null>(0)
  const items = limit ? (data ?? []).slice(0, limit) : data ?? []

  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading eyebrow="FAQ" title="Questions homeowners ask us most" lead="Straight answers — including when you don't need a cleaning yet." align="left" />
        </div>
        <div className="lg:col-span-8">
          <div className="card divide-y divide-line overflow-hidden">
            {items.map((f, i) => {
              const isOpen = open === i
              return (
                <div key={f.id} className={isOpen ? 'bg-tint/[0.03]' : ''}>
                  <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6" aria-expanded={isOpen}>
                    <span className={`font-display text-[16px] font-bold sm:text-[17px] ${isOpen ? 'text-fg' : 'text-fg-soft'}`}>{f.question}</span>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all ${isOpen ? 'rotate-180 bg-accent-400 text-bg' : 'bg-tint/[0.05] text-fg-soft ring-1 ring-line-strong'}`}>
                      <Icon name="chevron" size={16} />
                    </span>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-[15px] leading-relaxed text-fg-muted sm:px-6">{f.answer}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Section>
  )
}
