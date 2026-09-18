import type { ReactNode } from 'react'
import { api } from './api'
import { useFetch } from './hooks'
import { FALLBACK_SITE, SiteContext } from './site-context'


export function SiteProvider({ children }: { children: ReactNode }) {
  const { data } = useFetch(api.site, 'site')
  return <SiteContext.Provider value={data ?? FALLBACK_SITE}>{children}</SiteContext.Provider>
}
