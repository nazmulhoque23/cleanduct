import { useState, type FormEvent } from 'react'
import { adminApi, ApiError, type SettingField } from '../../lib/api'
import { useFetch } from '../../lib/hooks'
import { Button } from '../../components/Button'
import { PageTitle } from './ui'
import { INPUT } from './format'

const GROUPS: { title: string; blurb: string; keys: string[] }[] = [
  { title: 'Business', blurb: 'Shown across the site, in emails and in Google structured data.', keys: ['site_name', 'site_tagline', 'site_phone', 'site_email', 'site_address', 'site_hours'] },
  { title: 'Reputation', blurb: 'The rating badge in the header and the trust bar.', keys: ['site_rating', 'site_review_count', 'site_year_founded'] },
  { title: 'Social links', blurb: 'Leave blank to hide an icon in the footer.', keys: ['social_facebook', 'social_instagram', 'social_youtube', 'social_google'] },
  { title: 'Online booking', blurb: 'Controls what customers can pick on the Book page. Changes apply immediately.', keys: ['booking_windows', 'booking_capacity', 'booking_days', 'booking_lead_days'] },
]

export function Settings({ token }: { token: string }) {
  const api = adminApi(token)
  const [refresh, setRefresh] = useState(0)
  const { data } = useFetch(() => api.settings(), `settings-${refresh}`)
  if (!data) return <p className="text-sm text-fg-muted">Loading…</p>
  return <SettingsForm key={refresh} fields={data.fields} api={api} onSaved={() => setRefresh((n) => n + 1)} />
}

function SettingsForm({ fields, api, onSaved }: { fields: SettingField[]; api: ReturnType<typeof adminApi>; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.value])))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const byKey = new Map(fields.map((f) => [f.key, f]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    setErrors({})
    try {
      await api.saveSettings(values)
      setMsg('Saved. The site is using the new values now.')
      onSaved()
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields ?? {})
        setMsg(err.fields ? 'Please fix the highlighted fields.' : err.message)
      } else setMsg('Save failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <PageTitle eyebrow="Business" title="Settings">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </PageTitle>
      {msg && <p className={`mt-4 text-sm ${msg.startsWith('Saved') ? 'text-emerald-300' : 'text-red-400'}`}>{msg}</p>}

      <div className="mt-6 space-y-6">
        {GROUPS.map((g) => (
          <section key={g.title} className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold">{g.title}</h2>
            <p className="mt-1 text-sm text-fg-muted">{g.blurb}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {g.keys.map((k) => {
                const f = byKey.get(k)
                if (!f) return null
                const wide = k === 'site_hours' || k === 'booking_windows' || k === 'site_address'
                return (
                  <label key={k} className={`block ${wide ? 'sm:col-span-2' : ''}`}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fg-muted">{f.label}</span>
                    <input
                      type={f.kind === 'number' ? 'number' : 'text'}
                      step={f.kind === 'number' ? 'any' : undefined}
                      value={values[k] ?? ''}
                      onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                      className={INPUT}
                    />
                    {f.help && <span className="mt-1 block text-xs text-fg-muted">{f.help}</span>}
                    {errors[k] && <span className="mt-1 block text-xs text-red-400">{errors[k]}</span>}
                  </label>
                )
              })}
            </div>
          </section>
        ))}
        <p className="text-xs text-fg-muted">Clearing a field reverts it to the value in the server's environment (.env).</p>
      </div>
    </form>
  )
}
