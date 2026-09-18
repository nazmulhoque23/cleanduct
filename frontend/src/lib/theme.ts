import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'cleanduct.theme'
const listeners = new Set<() => void>()

// index.html sets data-theme before first paint (from localStorage or the OS
// preference) so there is no flash; this module just reads/updates it.
function current(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(t: Theme) {
  const root = document.documentElement
  root.classList.add('theme-transition')
  root.dataset.theme = t
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f4f7fb' : '#070b14')
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* private mode */
  }
  window.setTimeout(() => root.classList.remove('theme-transition'), 300)
  listeners.forEach((l) => l())
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    current,
    () => 'dark' as Theme,
  )
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')]
}
