import nextra from 'nextra'

const withNextra = nextra({})

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    resolveAlias: {
      'next-mdx-import-source-file': './mdx-components.js',
    },
  },
}

export default withNextra(nextConfig)
