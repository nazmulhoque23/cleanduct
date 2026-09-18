import { Icon } from './Icon'

export function Stars({ rating, size = 16, className = '' }: { rating: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          className={i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-surface-3 text-surface-3'}
          strokeWidth={0}
        />
      ))}
    </span>
  )
}
