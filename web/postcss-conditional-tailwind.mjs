// Tailwind 3's PostCSS plugin throws on any stylesheet that uses `@layer`
// without a matching `@tailwind` directive. Nextra's precompiled theme CSS
// (nextra-theme-docs/style.css) does exactly that, and Turbopack runs the
// project PostCSS pipeline on it. Turbopack also does not expose the source
// file path to the PostCSS config function, so we cannot exclude vendor CSS
// by path.
//
// We keep Tailwind as a normal top-level plugin (so its internal fs lookups,
// e.g. preflight.css, resolve correctly inside Turbopack). Around it we run
// two guards: for stylesheets that contain NO `@tailwind` directive (i.e.
// vendor/precompiled CSS, never our own globals.css), we temporarily rename
// `@layer` to a name Tailwind ignores, then rename it back afterwards. This
// dodges Tailwind's directive check while preserving the cascade layers.

const PLACEHOLDER = 'nextra-cascade-layer'

function hasTailwindDirective(root) {
  let found = false
  root.walkAtRules('tailwind', () => {
    found = true
  })
  return found
}

export function hideVendorLayers() {
  return {
    postcssPlugin: 'hide-vendor-layers',
    Once(root) {
      if (hasTailwindDirective(root)) return
      root.walkAtRules('layer', (rule) => {
        rule.name = PLACEHOLDER
      })
    },
  }
}
hideVendorLayers.postcss = true

export function restoreVendorLayers() {
  return {
    postcssPlugin: 'restore-vendor-layers',
    OnceExit(root) {
      root.walkAtRules(PLACEHOLDER, (rule) => {
        rule.name = 'layer'
      })
    },
  }
}
restoreVendorLayers.postcss = true
