// Lightweight analytics: GA4 and/or Plausible, both optional and env-driven.
//
//   VITE_GA_ID=G-XXXXXXXXXX          → Google Analytics 4 via gtag.js
//   VITE_PLAUSIBLE_DOMAIN=cleanduct.com → Plausible (privacy-friendly, no cookie banner)
//
// Events tracked: page_view (route change), lead_submit, booking_submit,
// phone_click (any tel: link), cta_click (data-cta attribute).

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void
  }
}

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined
const PLAUSIBLE = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined

let initialised = false

export function initAnalytics() {
  if (initialised || typeof window === 'undefined') return
  initialised = true

  if (GA_ID) {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
    document.head.appendChild(s)
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments)
    }
    window.gtag('js', new Date())
    // We send page_view manually on route change.
    window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true })
  }

  if (PLAUSIBLE) {
    const s = document.createElement('script')
    s.defer = true
    s.dataset.domain = PLAUSIBLE
    s.src = 'https://plausible.io/js/script.manual.js'
    document.head.appendChild(s)
    window.plausible =
      window.plausible ||
      function (...args: unknown[]) {
        ;((window as unknown as { plausible: { q: unknown[] } }).plausible.q =
          (window as unknown as { plausible: { q?: unknown[] } }).plausible.q || []).push(args)
      }
  }

  // Delegated click tracking for phone links and CTA buttons.
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement | null)?.closest('a, button') as HTMLElement | null
    if (!el) return
    const href = el.getAttribute('href') ?? ''
    if (href.startsWith('tel:')) track('phone_click', { location: window.location.pathname })
    else if (el.dataset.cta) track('cta_click', { cta: el.dataset.cta, location: window.location.pathname })
  })
}

export function trackPageView(path: string) {
  if (GA_ID && window.gtag) window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href })
  if (PLAUSIBLE && window.plausible) window.plausible('pageview')
}

export function track(event: string, props: Record<string, string | number> = {}) {
  if (GA_ID && window.gtag) window.gtag('event', event, props)
  if (PLAUSIBLE && window.plausible) window.plausible(event, { props })
  if (import.meta.env.DEV) console.debug('[analytics]', event, props)
}
