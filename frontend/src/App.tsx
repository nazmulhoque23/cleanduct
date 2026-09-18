import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { SiteProvider } from './lib/site'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { MobileCallBar } from './components/MobileCallBar'
import { Home } from './pages/Home'
import { Services } from './pages/Services'
import { ServiceDetail } from './pages/ServiceDetail'
import { ServiceAreas, ServiceAreaDetail } from './pages/ServiceAreas'
import { About } from './pages/About'
import { Blog, BlogPost } from './pages/Blog'
import { Contact } from './pages/Contact'
import { Reviews } from './pages/Reviews'
import { Privacy, Terms } from './pages/Legal'
import { NotFound } from './pages/NotFound'

function Layout() {
  const { pathname, hash } = useLocation()
  // Scroll to top on navigation, or to the hash target if present.
  useEffect(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0 })
    }
  }, [pathname, hash])

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MobileCallBar />
    </div>
  )
}

export default function App() {
  return (
    <SiteProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:slug" element={<ServiceDetail />} />
          <Route path="service-areas" element={<ServiceAreas />} />
          <Route path="service-areas/:slug" element={<ServiceAreaDetail />} />
          <Route path="about" element={<About />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </SiteProvider>
  )
}
