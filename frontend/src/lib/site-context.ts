import { createContext, useContext } from 'react'
import type { SiteInfo } from './api'

// Fallback used until /api/site responds (and if the API is down), so the
// header/footer never render empty.
export const FALLBACK_SITE: SiteInfo = {
  name: 'CleanDuct',
  tagline: 'Cleaner air. Safer home. Honest pricing.',
  phone: '(312) 555-0148',
  phoneHref: 'tel:+13125550148',
  email: 'hello@cleanduct.example',
  address: '7 N Roselle Rd, Schaumburg, IL 60193',
  hours: ['Mon–Fri 7:00 AM – 8:00 PM', 'Sat 8:00 AM – 6:00 PM', 'Sun Closed'],
  rating: 4.9,
  reviewCount: 1284,
  yearFounded: 2011,
  social: { facebook: '#', instagram: '#', youtube: '#', google: '#' },
}

export const SiteContext = createContext<SiteInfo>(FALLBACK_SITE)

export const useSite = () => useContext(SiteContext)
