// Typed client for the Go backend. All paths are relative so the same
// build works in dev (Vite proxy) and production (Go serves the SPA).

export interface Service {
  id: number
  slug: string
  name: string
  shortDesc: string
  longDesc: string
  icon: string
  category: 'residential' | 'commercial'
  startingAt: number | null
  featured: boolean
}

export interface ServiceArea {
  id: number
  slug: string
  city: string
  state: string
  zipCodes: string
  blurb: string
  featured: boolean
}

export interface Testimonial {
  id: number
  author: string
  location: string
  rating: number
  quote: string
  service: string
  source: string
  reviewedAt: string
}

export interface FAQ {
  id: number
  question: string
  answer: string
}

export interface Promotion {
  id: number
  title: string
  description: string
  badge: string
  code: string
  expiresAt: string | null
}

export interface Post {
  id: number
  slug: string
  title: string
  excerpt: string
  body?: string
  category: string
  readMinutes: number
  publishedAt: string
}

export interface SiteInfo {
  name: string
  tagline: string
  phone: string
  phoneHref: string
  email: string
  address: string
  hours: string[]
  rating: number
  reviewCount: number
  yearFounded: number
  social: { facebook: string; instagram: string; youtube: string; google: string }
}

export interface LeadInput {
  fullName: string
  email: string
  phone: string
  zipCode: string
  service: string
  contactPref: 'phone' | 'text' | 'email'
  message: string
  sourcePage: string
  website: string // honeypot — always leave empty
}

export class ApiError extends Error {
  status: number
  fields?: Record<string, string>
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    let msg = res.statusText
    let fields: Record<string, string> | undefined
    try {
      const body = await res.json()
      msg = body.error ?? msg
      fields = body.fields
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, msg, fields)
  }
  return res.json() as Promise<T>
}

export const api = {
  site: () => request<SiteInfo>('/site'),
  services: (opts?: { featured?: boolean; category?: string }) => {
    const q = new URLSearchParams()
    if (opts?.featured) q.set('featured', '1')
    if (opts?.category) q.set('category', opts.category)
    const qs = q.toString()
    return request<Service[]>(`/services${qs ? `?${qs}` : ''}`)
  },
  service: (slug: string) => request<Service>(`/services/${slug}`),
  serviceAreas: () => request<ServiceArea[]>('/service-areas'),
  serviceArea: (slug: string) => request<ServiceArea>(`/service-areas/${slug}`),
  testimonials: () => request<Testimonial[]>('/testimonials'),
  faqs: () => request<FAQ[]>('/faqs'),
  promotions: () => request<Promotion[]>('/promotions'),
  posts: () => request<Post[]>('/posts'),
  post: (slug: string) => request<Post>(`/posts/${slug}`),
  createLead: (input: LeadInput) =>
    request<{ ok: boolean; id?: number }>('/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
}
