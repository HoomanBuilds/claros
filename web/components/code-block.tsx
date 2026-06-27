"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

export function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }

  return (
    <div className="border-2 border-foreground bg-foreground text-background">
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-background/20">
        <span className="text-[10px] tracking-widest uppercase text-background/50 font-mono">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-background/50 hover:text-[#ea580c] transition-colors"
        >
          {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  )
}
