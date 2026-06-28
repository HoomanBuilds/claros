import { hideVendorLayers, restoreVendorLayers } from './postcss-conditional-tailwind.mjs'

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: [hideVendorLayers(), 'tailwindcss', restoreVendorLayers()],
}

export default config
