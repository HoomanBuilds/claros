import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, sep, extname } from 'node:path'

const root = resolve('out')
const port = Number(process.env.PORT ?? 3108)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' }

createServer(async (req, res) => {
  try {
    let file = resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`)
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Invalid path')
    let info = await stat(file)
    if (info.isDirectory()) {
      file = resolve(file, 'index.html')
      info = await stat(file)
    }
    if (!info.isFile()) throw new Error('Not a file')
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
}).listen(port, '127.0.0.1', () => console.log(`Static Claros frontend: http://127.0.0.1:${port}`))
