import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'white'
type Size = 'sm' | 'md' | 'lg'

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ' +
  'active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none whitespace-nowrap select-none'

const variants: Record<Variant, string> = {
  // Electric cyan pill with dark text — the conversion button.
  primary:
    'bg-accent-400 text-bg shadow-[0_0_0_1px_rgb(34_211_238/0.4),0_10px_30px_-10px_rgb(34_211_238/0.7)] ' +
    'hover:bg-accent-300 hover:shadow-glow hover:-translate-y-0.5',
  // Glass pill.
  secondary:
    'bg-tint/[0.06] text-fg ring-1 ring-inset ring-line-strong backdrop-blur hover:bg-tint/10 hover:ring-accent-400/50 hover:-translate-y-0.5',
  ghost: 'bg-transparent text-fg-soft ring-1 ring-inset ring-line hover:text-fg hover:ring-line-strong hover:bg-tint/[0.04]',
  // Solid light pill for use on gradient/photo backgrounds.
  white: 'bg-fg text-bg hover:bg-fg/90 hover:-translate-y-0.5 shadow-card',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-13 px-7 text-base',
}

interface Common {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined; href?: undefined }
type LinkProps = Common & { to: string; href?: undefined }
type AnchorProps = Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: undefined }

export function Button(props: ButtonProps | LinkProps | AnchorProps) {
  const { variant = 'primary', size = 'md', className = '', children } = props
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`

  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={cls}>
        {children}
      </Link>
    )
  }
  if ('href' in props && props.href) {
    const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props
    return (
      <a className={cls} {...rest}>
        {children}
      </a>
    )
  }
  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as ButtonProps
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}
