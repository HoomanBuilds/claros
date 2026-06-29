// Tailwind 3's PostCSS plugin throws on any stylesheet that uses `@layer`
// without a matching `@tailwind` directive. Nextra's precompiled theme CSS
// (nextra-theme-docs/dist/style.css) does exactly that, and Turbopack runs the
// project PostCSS pipeline on it. Turbopack also does not expose the source
// file path to the PostCSS config function, so we cannot exclude vendor CSS
// by path.
//
// Beyond dodging that check, there is a cascade problem. Nextra is built with
// Tailwind 4 and wraps ALL its rules in `@layer theme, base, components,
// utilities`. Our host app (globals.css) uses Tailwind 3, whose `@tailwind base`
// preflight is emitted UNLAYERED. In the CSS cascade, unlayered rules beat any
// layered rule regardless of specificity, so the host preflight (`*{border:0}`,
// `h1{margin:0;font-size:inherit}`, ...) was clobbering every Nextra style:
// borderless tables, unstyled headings, collapsed spacing, wrapping card arrows.
//
// Fix: for vendor CSS (no `@tailwind` directive, i.e. never our globals.css), we
// FLATTEN its cascade layers, i.e. unwrap `@layer name { ... }` into plain
// unlayered rules. Nextra's class selectors then win against the host preflight
// by normal specificity, and the docs render exactly as a standalone Nextra
// site. We still rename `@layer` to a placeholder BEFORE Tailwind runs so its
// directive check passes, then unwrap on exit.

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
    postcssPlugin: 'flatten-vendor-layers',
    OnceExit(root) {
      root.walkAtRules(PLACEHOLDER, (rule) => {
        if (rule.nodes && rule.nodes.length) {
          // `@layer name { rules }` -> hoist `rules` to unlayered
          rule.replaceWith(...rule.nodes)
        } else {
          // bare `@layer a, b, c;` ordering statement -> drop it
          rule.remove()
        }
      })
    },
  }
}
restoreVendorLayers.postcss = true
