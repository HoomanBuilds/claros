"use client"

import Link from "next/link"
import { ArrowRight, Check, Minus } from "lucide-react"
import { motion } from "framer-motion"

const ease = [0.22, 1, 0.36, 1] as const

/* ── status line ── */
function StatusLine() {
  return (
    <div className="flex items-center gap-2 text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
      <span className="h-1.5 w-1.5 bg-[#ea580c] animate-blink" />
      <span>free on-chain reads · x402 for metered access</span>
    </div>
  )
}

function BlinkDot() {
  return <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
}

interface Tier {
  id: string
  name: string
  price: string
  period: string
  tag: string | null
  description: string
  features: { text: string; included: boolean }[]
  cta: string
  href: string
  highlighted: boolean
}

const TIERS: Tier[] = [
  {
    id: "rest",
    name: "REST_API",
    price: "FREE",
    period: "/ forever",
    tag: null,
    description: "The Hermes of Claros. Read feeds over plain HTTP — no wallet, no key.",
    features: [
      { text: "GET /v1/feeds (all live feeds)", included: true },
      { text: "GET /v1/feeds/:id (one reading)", included: true },
      { text: "GET /v1/datasets (232 datasets)", included: true },
      { text: "CORS open, JSON, cached", included: true },
      { text: "On-chain trust assumptions", included: false },
      { text: "Usable inside a contract", included: false },
    ],
    cta: "OPEN REST",
    href: "/docs#rest",
    highlighted: false,
  },
  {
    id: "sdk",
    name: "SDK_/_ON-CHAIN",
    price: "FREE",
    period: "/ forever",
    tag: "RECOMMENDED",
    description: "Read directly from Casper state — off-chain via the SDK or on-chain from your contract.",
    features: [
      { text: "claros-oracle npm SDK", included: true },
      { text: "getReading(id) → value + metadata", included: true },
      { text: "Reads node state directly (no indexer)", included: true },
      { text: "Cross-contract get_latest(id)", included: true },
      { text: "Self-describing decimals + unit", included: true },
      { text: "Pyth-style integer scaling", included: true },
    ],
    cta: "READ THE DOCS",
    href: "/docs",
    highlighted: true,
  },
  {
    id: "x402",
    name: "X402_METERED",
    price: "WCSPR",
    period: "/ call",
    tag: "PAID",
    description: "Pay-per-read from the hosted feed server, settled in WCSPR over x402. For agents & apps.",
    features: [
      { text: "HTTP 402 → auto-pay → data", included: true },
      { text: "Settled in WCSPR, per call", included: true },
      { text: "transfer_with_authorization", included: true },
      { text: "On-chain provenance in response", included: true },
      { text: "Agent-to-agent micropayments", included: true },
      { text: "Funds the oracle's attestations", included: true },
    ],
    cta: "X402 DOCS",
    href: "/docs#x402",
    highlighted: false,
  },
]

function PricingCard({ tier, index }: { tier: Tier; index: number }) {
  const isExternal = tier.href.startsWith("http")

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.12, duration: 0.6, ease }}
      className={`flex flex-col h-full ${
        tier.highlighted
          ? "border-2 border-foreground bg-foreground text-background"
          : "border-2 border-foreground bg-background text-foreground"
      }`}
    >
      {/* Card header */}
      <div
        className={`flex items-center justify-between px-5 py-3 border-b-2 ${
          tier.highlighted ? "border-background/20" : "border-foreground"
        }`}
      >
        <span className="text-[10px] tracking-[0.2em] uppercase font-mono">{tier.name}</span>
        <div className="flex items-center gap-2">
          {tier.tag && (
            <span className="bg-[#ea580c] text-background text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 font-mono">
              {tier.tag}
            </span>
          )}
          <span className="text-[10px] tracking-[0.2em] font-mono opacity-50">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Price block */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl lg:text-4xl font-mono font-bold tracking-tight">{tier.price}</span>
          {tier.period && (
            <span
              className={`text-xs font-mono tracking-widest uppercase ${
                tier.highlighted ? "text-background/50" : "text-muted-foreground"
              }`}
            >
              {tier.period}
            </span>
          )}
        </div>
        <p
          className={`text-xs font-mono mt-3 leading-relaxed ${
            tier.highlighted ? "text-background/60" : "text-muted-foreground"
          }`}
        >
          {tier.description}
        </p>
      </div>

      {/* Feature list */}
      <div className={`flex-1 px-5 py-4 border-t-2 ${tier.highlighted ? "border-background/20" : "border-foreground"}`}>
        <div className="flex flex-col gap-3">
          {tier.features.map((feature, fi) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12 + 0.3 + fi * 0.04, duration: 0.35, ease }}
              className="flex items-start gap-3"
            >
              {feature.included ? (
                <Check size={12} strokeWidth={2.5} className="mt-0.5 shrink-0 text-[#ea580c]" />
              ) : (
                <Minus
                  size={12}
                  strokeWidth={2}
                  className={`mt-0.5 shrink-0 ${tier.highlighted ? "text-background/30" : "text-muted-foreground/40"}`}
                />
              )}
              <span
                className={`text-xs font-mono leading-relaxed ${
                  feature.included
                    ? ""
                    : tier.highlighted
                    ? "text-background/30 line-through"
                    : "text-muted-foreground/40 line-through"
                }`}
              >
                {feature.text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5 pt-3">
        <Link href={tier.href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer" : undefined}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`group w-full flex items-center justify-center gap-0 text-xs font-mono tracking-wider uppercase ${
              tier.highlighted ? "bg-background text-foreground" : "bg-foreground text-background"
            }`}
          >
            <span className="flex items-center justify-center w-9 h-9 bg-[#ea580c]">
              <ArrowRight size={14} strokeWidth={2} className="text-background" />
            </span>
            <span className="flex-1 py-2.5 text-center">{tier.cta}</span>
          </motion.div>
        </Link>
      </div>
    </motion.div>
  )
}

export function PricingSection() {
  return (
    <section id="consume" className="w-full px-6 py-20 lg:px-12 scroll-mt-24">
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease }}
        className="flex items-center gap-4 mb-8"
      >
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {"// SECTION: CONSUME"}
        </span>
        <div className="flex-1 border-t border-border" />
        <BlinkDot />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">006</span>
      </motion.div>

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12"
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl lg:text-3xl font-mono font-bold tracking-tight uppercase text-foreground text-balance">
            Three ways to consume
          </h2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-md">
            On-chain reads are free — REST, the SDK, or a cross-contract call. Or pay per call with
            x402 for a hosted, metered feed.
          </p>
        </div>
        <StatusLine />
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        {TIERS.map((tier, i) => (
          <PricingCard key={tier.id} tier={tier} index={i} />
        ))}
      </div>

      {/* Bottom note */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5, ease }}
        className="flex items-center gap-3 mt-6"
      >
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {"* Values are attestations on Casper testnet. Verify any feed on-chain by feed_id."}
        </span>
        <div className="flex-1 border-t border-border" />
      </motion.div>
    </section>
  )
}
