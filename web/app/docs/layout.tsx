import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import { RadioTower } from 'lucide-react'
import 'nextra-theme-docs/style.css'
import './docs-theme.css'

const logo = (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, letterSpacing: '0.01em' }}>
    <RadioTower size={18} style={{ color: '#ea580c' }} aria-hidden />
    Claros
  </span>
)

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="nextra-scope">
      <Layout
        navbar={
          <Navbar
            logo={logo}
            logoLink="/"
            projectLink="https://github.com/HoomanBuilds/claros"
          />
        }
        pageMap={await getPageMap('/docs')}
        docsRepositoryBase="https://github.com/HoomanBuilds/claros/tree/main/web/content/docs"
        editLink="Edit this page on GitHub"
        sidebar={{ defaultMenuCollapseLevel: 1, toggleButton: true }}
        toc={{ backToTop: 'Scroll to top' }}
        footer={
          <Footer>
            <span style={{ fontSize: '0.85rem' }}>© {new Date().getFullYear()} Claros. Verifiable real-world data, attested on Casper.</span>
          </Footer>
        }
      >
        {children}
      </Layout>
    </div>
  )
}
