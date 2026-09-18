// Small shared components for the admin pages.
import { STATUS_LABEL, STATUS_TONE } from './format'

export function Badge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_TONE[status] ?? STATUS_TONE.completed}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function PageTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold">{title}</h1>
      </div>
      {children}
    </div>
  )
}
