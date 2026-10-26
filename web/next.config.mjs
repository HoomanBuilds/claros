import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    resolveAlias: {
      'next-mdx-import-source-file': './mdx-components.js',
    },
  },
}

export default withNextra(nextConfig)
