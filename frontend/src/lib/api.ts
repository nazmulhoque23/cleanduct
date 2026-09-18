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
  intro: string
  neighborhoods: string
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
  smsConsent: boolean
  website: string // honeypot — always leave empty
}

export interface BookingInput {
  fullName: string
  email: string
  phone: string
  address: string
  zipCode: string
  service: string
  slotDate: string
  slotWindow: string
  notes: string
  smsConsent: boolean
  website: string
}

export interface AvailabilityDay {
  date: string
  label: string
  windows: Record<string, number>
}

export interface Availability {
  windows: string[]
  days: AvailabilityDay[]
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
  availability: () => request<Availability>('/availability'),
  createBooking: (input: BookingInput) =>
    request<{ ok: boolean; id?: number }>('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
}

// ---- Admin (bearer token) ---------------------------------------------------

export type Row = Record<string, unknown> & { id: number }
export interface FieldSpec {
  key: string
  kind: 'text' | 'int' | 'bool' | 'date'
  required: boolean
}

export function adminApi(token: string) {
  const auth = { Authorization: `Bearer ${token}` }
  const json = { ...auth, 'Content-Type': 'application/json' }
  return {
    me: () => request<{ ok: boolean }>('/admin/me', { headers: auth }),
    schema: () => request<Record<string, FieldSpec[]>>('/admin/schema', { headers: auth }),
    leads: () => request<Lead[]>('/admin/leads', { headers: auth }),
    setLeadStatus: (id: number, status: string) =>
      request<{ ok: boolean }>(`/admin/leads/${id}`, { method: 'PATCH', headers: json, body: JSON.stringify({ status }) }),
    bookings: () => request<Booking[]>('/admin/bookings', { headers: auth }),
    setBookingStatus: (id: number, status: string) =>
      request<{ ok: boolean }>(`/admin/bookings/${id}`, { method: 'PATCH', headers: json, body: JSON.stringify({ status }) }),
    list: (resource: string) => request<Row[]>(`/admin/content/${resource}`, { headers: auth }),
    create: (resource: string, body: Record<string, unknown>) =>
      request<{ ok: boolean; id: number }>(`/admin/content/${resource}`, { method: 'POST', headers: json, body: JSON.stringify(body) }),
    update: (resource: string, id: number, body: Record<string, unknown>) =>
      request<{ ok: boolean }>(`/admin/content/${resource}/${id}`, { method: 'PATCH', headers: json, body: JSON.stringify(body) }),
    remove: (resource: string, id: number) => request<{ ok: boolean }>(`/admin/content/${resource}/${id}`, { method: 'DELETE', headers: auth }),
  }
}

export interface Lead {
  id: number
  fullName: string
  email: string
  phone: string
  zipCode: string
  service: string
  contactPref: string
  message: string
  sourcePage: string
  smsConsent: boolean
  status: 'new' | 'contacted' | 'booked' | 'closed'
  createdAt: string
}

export interface Booking {
  id: number
  fullName: string
  email: string
  phone: string
  address: string
  zipCode: string
  service: string
  slotDate: string
  slotWindow: string
  notes: string
  smsConsent: boolean
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled'
  createdAt: string
}
