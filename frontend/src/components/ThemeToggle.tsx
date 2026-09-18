import { useTheme } from '../lib/theme'
import { Icon } from './Icon'

/** Sun/moon switch. Animated knob slides between the two icons. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, toggle] = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`relative inline-flex h-9 w-[64px] shrink-0 items-center rounded-full bg-tint/[0.06] ring-1 ring-inset ring-line-strong transition-colors hover:ring-accent-400/50 ${className}`}
    >
      <span className="absolute left-2 grid h-5 w-5 place-items-center text-fg-muted">
        <Icon name="sun" size={15} />
      </span>
      <span className="absolute right-2 grid h-5 w-5 place-items-center text-fg-muted">
        <Icon name="moon" size={15} />
      </span>
      <span
        className={`absolute top-1 grid h-7 w-7 place-items-center rounded-full bg-accent-400 text-bg shadow-glow transition-transform duration-300 ${
          dark ? 'translate-x-[33px]' : 'translate-x-1'
        }`}
      >
        <Icon name={dark ? 'moon' : 'sun'} size={15} />
      </span>
    </button>
  )
}
