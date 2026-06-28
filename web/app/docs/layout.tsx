import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Layout
      navbar={<Navbar logo={<b>Claros</b>} />}
      pageMap={await getPageMap('/docs')}
      footer={<Footer>Claros</Footer>}
      docsRepositoryBase="https://github.com/HoomanBuilds/claros"
    >
      {children}
    </Layout>
  )
}
