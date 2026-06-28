import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from '../../../mdx-components.js'

// Content lives in `content/docs`, so Nextra's route keys are prefixed with
// `docs` (it only strips the `content/` segment). This page is mounted under
// `app/docs`, which already contributes the `/docs` URL segment. To avoid a
// doubled `/docs/docs/...` path we strip the leading `docs` from the params
// here and add it back when importing the page.
const CONTENT_PREFIX = 'docs'

export async function generateStaticParams() {
  const params = await generateStaticParamsFor('mdxPath')()
  return params
    .filter((p) => Array.isArray(p.mdxPath) && p.mdxPath[0] === CONTENT_PREFIX)
    .map((p) => ({ mdxPath: p.mdxPath.slice(1) }))
}

function toContentPath(mdxPath) {
  return [CONTENT_PREFIX, ...(mdxPath || [])]
}

export async function generateMetadata(props) {
  const params = await props.params
  const { metadata } = await importPage(toContentPath(params.mdxPath))
  return metadata
}

const Wrapper = getMDXComponents().wrapper

export default async function Page(props) {
  const params = await props.params
  const result = await importPage(toContentPath(params.mdxPath))
  const { default: MDXContent, toc, metadata } = result
  return (
    <Wrapper toc={toc} metadata={metadata}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
