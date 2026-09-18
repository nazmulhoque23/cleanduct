import { useSeo } from '../lib/hooks'
import { useSite } from '../lib/site-context'
import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'

// Placeholder legal copy — replace with text reviewed by the business owner.
export function Privacy() {
  const site = useSite()
  useSeo(`Privacy Policy | ${site.name}`)
  return (
    <>
      <PageHeader eyebrow="Legal" title="Privacy Policy" />
      <Section>
        <div className="prose-post max-w-3xl">
          <p>
            {site.name} collects the information you submit through our quote form (name, phone, email, ZIP code and message)
            solely to respond to your request and schedule service. We do not sell or share personal information with third parties
            for marketing.
          </p>
          <h2>Communications</h2>
          <p>By submitting a form you agree we may contact you by phone, text or email about your request. Reply STOP to any text to opt out.</p>
          <h2>Analytics</h2>
          <p>We may use privacy-respecting analytics to understand how the site is used. No personal data is included.</p>
          <h2>Contact</h2>
          <p>Questions? Email {site.email}.</p>
        </div>
      </Section>
    </>
  )
}

export function Terms() {
  const site = useSite()
  useSeo(`Terms of Service | ${site.name}`)
  return (
    <>
      <PageHeader eyebrow="Legal" title="Terms of Service" />
      <Section>
        <div className="prose-post max-w-3xl">
          <h2>Quotes and pricing</h2>
          <p>Quotes are based on the information you provide and confirmed on site before work begins. The confirmed price is the final price unless you approve additional services.</p>
          <h2>Satisfaction guarantee</h2>
          <p>If you are not satisfied with a completed service, contact us within 14 days and we will return to address the issue at no charge.</p>
          <h2>Promotions</h2>
          <p>Offers cannot be combined, must be mentioned at booking and are subject to the expiration dates shown.</p>
        </div>
      </Section>
    </>
  )
}
