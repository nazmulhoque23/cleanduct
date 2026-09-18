import { useSeo } from '../lib/hooks'
import { Button } from '../components/Button'

export function NotFound() {
  useSeo('Page not found')
  return (
    <section className="container-x py-32 text-center">
      <p className="eyebrow justify-center">404</p>
      <h1 className="mt-3 text-4xl font-extrabold">That page blew away.</h1>
      <p className="mx-auto mt-3 max-w-md text-fg-muted">The link may be old or mistyped. Let's get you back to cleaner air.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button to="/">Go home</Button>
        <Button to="/contact" variant="ghost">
          Contact us
        </Button>
      </div>
    </section>
  )
}
