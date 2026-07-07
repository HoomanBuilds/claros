"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

const ease = [0.22, 1, 0.36, 1] as const

const STEPS = [
  {
    id: "01",
    name: "PROVE",
    text: "Enroll in the allowlist and verify a Groth16 proof on-chain. Anonymous membership, permanent credential.",
  },
  {
    id: "02",
    name: "CLAIM",
    text: "Register your feed_id from the 232-dataset catalog or your own source. Claims are enforced on-chain: only you can attest it.",
  },
  {
    id: "03",
    name: "ATTEST",
    text: "Your key signs, your LLM decides. Any OpenAI-compatible model works, DeepSeek to local Ollama. Anomaly-checked against real on-chain history.",
  },
  {
    id: "04",
    name: "EARN",
    text: "Serve your feed over x402. Every read settles WCSPR directly to your account. No middleman, no revenue share.",
  },
]

export function JoinNetwork() {
  return (
    <section className="w-full px-6 py-20 lg:px-12">
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease }}
        className="flex items-center gap-4 mb-8"
      >
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {"// SECTION: JOIN_THE_NETWORK"}
        </span>
        <div className="flex-1 border-t border-border" />
        <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">007</span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12"
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl lg:text-3xl font-mono font-bold tracking-tight uppercase text-foreground text-balance">
            Run an agent. Earn.
          </h2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-md">
            Claros is an open attester network, not a single oracle. Join with a ZK
            credential, claim feeds only you can write, and get paid per read.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
          <span className="h-1.5 w-1.5 bg-[#ea580c]" />
          <span>zk-gated entry · claims enforced on-chain</span>
        </div>
      </motion.div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-t-2 border-l-2 border-foreground">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.1, duration: 0.5, ease }}
            className="flex flex-col border-r-2 border-b-2 border-foreground bg-background"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b-2 border-foreground">
              <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase">{s.name}</span>
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#ea580c]">{s.id}</span>
            </div>
            <p className="px-5 py-5 text-xs font-mono text-muted-foreground leading-relaxed">{s.text}</p>
          </motion.div>
        ))}
      </div>

      {/* Proof strip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.5, ease }}
        className="flex flex-col md:flex-row md:items-center gap-3 border-2 border-t-0 border-foreground bg-foreground text-background px-5 py-4"
      >
        <span className="bg-[#ea580c] text-background text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 font-mono shrink-0">
          Proven on-chain
        </span>
        <span className="text-xs font-mono leading-relaxed">
          An independent operator enrolled via ZK, claimed the US48 solar feed, attested 4,291
          MWh with its own LLM, and was paid 1 WCSPR for a single x402 read.
        </span>
        <a
          href="https://testnet.cspr.live/transaction/65534cbb1351abdbdbe27298580772ee1a74c8ac696a8e6ace0209ab3b2e3ce4"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-mono tracking-widest uppercase text-[#ea580c] hover:underline shrink-0 md:ml-auto"
        >
          Settlement tx ↗
        </a>
      </motion.div>

      {/* SDK strip + CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 mt-8 border-2 border-foreground">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.5, ease }}
          className="flex flex-col gap-3 px-5 py-5 border-b-2 lg:border-b-0 lg:border-r-2 border-foreground"
        >
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            {"// READ IT IN CODE"}
          </span>
          <pre className="text-xs font-mono leading-relaxed overflow-x-auto">
            <code>{`$ npm install claros-oracle

const wti = await new ClarosOracle()
  .getReading('EIA.PET.PRICE.WTI.DAILY')
// { value: 71.87, unit: '$/bbl', ... }`}</code>
          </pre>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.5, ease }}
          className="flex flex-col items-start justify-center gap-4 px-5 py-6"
        >
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            The full operator path, keys to first WCSPR, is documented step by step.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/docs/network/run-an-agent">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group flex items-center gap-0 bg-foreground text-background text-xs font-mono tracking-wider uppercase"
              >
                <span className="flex items-center justify-center w-9 h-9 bg-[#ea580c]">
                  <ArrowRight size={14} strokeWidth={2} className="text-background" />
                </span>
                <span className="px-4 py-2.5">Start earning</span>
              </motion.button>
            </Link>
            <a
              href="https://www.npmjs.com/package/claros-oracle"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              SDK on npm
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
