"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

// A "Copy page" action that copies the readable text of the current docs page.
// It temporarily hides the button bar (data-copy-ignore) so the copied text
// never contains the button's own label, and reads innerText from the live DOM
// (innerText preserves line breaks and skips hidden nodes).
export function CopyPageButton() {
  const [copied, setCopied] = useState(false)

  const handle = async () => {
    const body =
      document.querySelector<HTMLElement>("main [data-pagefind-body]") ||
      document.querySelector<HTMLElement>("[data-pagefind-body]") ||
      document.querySelector<HTMLElement>("main")
    if (!body) return

    const ignored = Array.from(body.querySelectorAll<HTMLElement>("[data-copy-ignore]"))
    const restore = ignored.map((n) => [n, n.style.display] as const)
    ignored.forEach((n) => (n.style.display = "none"))
    const text = body.innerText.replace(/\n{3,}/g, "\n\n").trim()
    restore.forEach(([n, d]) => (n.style.display = d))

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked (e.g. insecure context); silently ignore
    }
  }

  return (
    <div className="copy-page-bar" data-copy-ignore data-pagefind-ignore>
      <button type="button" onClick={handle} className="copy-page-btn" aria-label="Copy page as text">
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        <span>{copied ? "Copied" : "Copy page"}</span>
      </button>
    </div>
  )
}
