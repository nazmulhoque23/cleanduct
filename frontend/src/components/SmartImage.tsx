import { useState, type ImgHTMLAttributes, type ReactNode } from 'react'

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  /** Path under /images, e.g. "hero.jpg". Drop real photos into frontend/public/images/. */
  src: string
  /** Rendered instead of the <img> until a real file exists (or if it fails to load). */
  fallback: ReactNode
  className?: string
}

/**
 * Image slot with graceful fallback. While `public/images/<src>` is missing,
 * the fallback (an SVG illustration / gradient) is shown, so the site looks
 * finished before photography arrives and real photos "just work" once added.
 */
export function SmartImage({ src, fallback, className = '', alt = '', ...rest }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback}</>
  return (
    <img
      src={`/images/${src}`}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  )
}
