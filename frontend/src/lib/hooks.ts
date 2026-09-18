import { useEffect, useState } from 'react'

interface State<T> {
  data: T | null
  error: Error | null
  loading: boolean
}

/**
 * Minimal data-fetching hook. `key` should change whenever the request
 * changes (e.g. a slug) so the effect re-runs.
 */
export function useFetch<T>(fetcher: () => Promise<T>, key: string): State<T> {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error: Error) => !cancelled && setState({ data: null, error, loading: false }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}

/** Scroll to top on route change. */
export function useScrollTop(dep: string) {
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [dep])
}

/** Set document title + meta description per page. */
export function useSeo(title: string, description?: string) {
  useEffect(() => {
    document.title = title
    if (description) {
      let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      if (!tag) {
        tag = document.createElement('meta')
        tag.name = 'description'
        document.head.appendChild(tag)
      }
      tag.content = description
    }
  }, [title, description])
}
