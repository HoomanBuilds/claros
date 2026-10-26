import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
assert.equal(config.framework, null)
assert.equal(config.outputDirectory, 'out')
for (const key of ['functions', 'crons', 'rewrites']) assert.ok(!config[key], `${key} must stay on AWS`)

const prerender = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'))
for (const [route, settings] of Object.entries(prerender.routes)) {
  assert.equal(settings.initialRevalidateSeconds, false, `ISR is enabled for ${route}`)
}

function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const file = join(path, entry.name)
    assert.ok(!entry.name.endsWith('.func'), `Function bundle found: ${file}`)
    return entry.isDirectory() ? walk(file) : [file]
  })
}

const files = walk('out')
assert.ok(files.some(file => file.endsWith('.html')))
assert.ok(existsSync('out/_pagefind/pagefind.js'), 'Docs search index is missing')
const middleware = JSON.parse(readFileSync('.next/server/middleware-manifest.json', 'utf8'))
assert.deepEqual(middleware.middleware, {})
assert.deepEqual(middleware.functions, {})
console.log(`Static export verified: ${files.length} files, no functions, middleware, rewrites, cron jobs, or ISR.`)
