import { Wallet, Coins, TrendingUp, ExternalLink } from "lucide-react"
import type { TreasurySnapshot } from "@/lib/treasury"
import { timeAgo } from "@/lib/format"

const VAULT_PKG = "a90b082d863c5977c6e54654fec10e523a38760529e664a87e9e8a8e887ffd7b"
const WISELENDING_PKG = "baa50d1500aa5361c497c06b40f2822ebb0b5fce5b1c3a037ea628cb68d920f3"
const VALIDATOR = "0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca"
const cspr = (path: string) => `https://testnet.cspr.live/${path}`

const fmt = (n: number, d = 0) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d, minimumFractionDigits: d > 0 ? d : 0 }).format(n)

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 border-r-2 border-b-2 border-foreground px-5 py-4">
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">{label}</span>
      <span className="text-2xl lg:text-3xl font-mono font-bold tracking-tight tabular-nums">{value}</span>
      {sub && <span className="text-[10px] font-mono text-muted-foreground">{sub}</span>}
    </div>
  )
}

export function TreasuryPanel({ snapshot }: { snapshot: TreasurySnapshot }) {
  const venueKeys = new Set(snapshot.venues.map((v) => v.key))
  const VENUES = [
    {
      key: "wiselending",
      label: "WiseLending",
      token: "sCSPR",
      icon: Coins,
      role: "Liquid staking: stake CSPR and hold yield-bearing sCSPR that compounds over time.",
      href: cspr(`contract-package/${WISELENDING_PKG}`),
    },
    {
      key: "native_delegation",
      label: "Native Delegation",
      token: "AUCTION",
      icon: TrendingUp,
      role: "Delegate to a validator and earn protocol staking rewards each era.",
      href: cspr(`validator/${VALIDATOR}`),
    },
    {
      key: "cspr_trade",
      label: "CSPR.trade",
      token: "DEX",
      icon: TrendingUp,
      role: "DEX swap rates are evaluated every cycle, but staking currently wins, so the agent stakes.",
      href: "https://www.cspr.trade",
    },
  ]

  return (
    <section className="w-full px-6 py-8 lg:px-12">
      <div className="flex items-center gap-4 mb-6">
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {"// AGENT_TREASURY_AND_EARNINGS"}
        </span>
        <div className="flex-1 border-t border-border" />
        <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">003</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl">
          Read live from the <span className="text-foreground">TreasuryVault</span> on Casper. The agent
          earns x402 read fees and routes idle treasury into on-chain yield. Every decision, with its
          reasoning, is recorded on-chain.
        </p>
        <a
          href={cspr(`contract-package/${VAULT_PKG}`)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-mono text-muted-foreground hover:text-[#ea580c] transition-colors"
        >
          <Wallet size={12} strokeWidth={2} /> verify treasury on-chain
        </a>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-l-2 border-t-2 border-foreground mb-8">
        <StatCard label="Agent Liquid" value={`${fmt(snapshot.liquidCspr, 2)}`} sub="CSPR · live balance" />
        <StatCard label="Reinvest Cycles" value={String(snapshot.reinvestCount)} sub="logged on-chain" />
        <StatCard label="Primary Venue" value={snapshot.primaryVenue.split(" ")[0]} sub={snapshot.primaryVenue} />
        <StatCard label="Strategy" value="AUTONOMOUS" sub="DeepSeek heartbeat" />
      </div>

      {/* Venue cards */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {"// YIELD_VENUES"}
        </span>
        <div className="flex-1 border-t border-border" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 border-l-2 border-t-2 border-foreground mb-8">
        {VENUES.map((v) => {
          const active = venueKeys.has(v.key)
          const Icon = v.icon
          return (
            <a
              key={v.key}
              href={v.href}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col gap-3 border-r-2 border-b-2 border-foreground px-5 py-5 hover:bg-foreground hover:text-background transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={15} strokeWidth={1.75} className="text-[#ea580c]" />
                  <span className="text-sm font-mono font-bold tracking-tight uppercase">{v.label}</span>
                </div>
                <span className={`text-[9px] tracking-[0.15em] uppercase font-mono px-2 py-0.5 ${active ? "bg-[#ea580c] text-background" : "text-muted-foreground group-hover:text-background/60 border border-border group-hover:border-background/30"}`}>
                  {active ? "active" : "evaluated"}
                </span>
              </div>
              <span className="text-[10px] tracking-[0.15em] uppercase font-mono text-muted-foreground group-hover:text-background/60">
                {v.token}
              </span>
              <span className="text-xs font-mono text-muted-foreground group-hover:text-background/70 leading-relaxed">{v.role}</span>
              <span className="mt-auto flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-mono text-muted-foreground group-hover:text-[#ea580c]">
                on-chain <ExternalLink size={10} strokeWidth={2} />
              </span>
            </a>
          )
        })}
      </div>

      {/* Reinvest ledger */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {"// REINVEST_LEDGER · on-chain"}
        </span>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {snapshot.reinvestCount} entries
        </span>
      </div>
      <div className="border-2 border-foreground">
        {snapshot.ledger.length === 0 && (
          <div className="px-4 py-8 text-center text-xs font-mono text-muted-foreground">no reinvest decisions recorded yet.</div>
        )}
        {snapshot.ledger.map((e, i) => (
          <div key={e.index} className={`flex flex-col gap-2 px-4 py-4 ${i > 0 ? "border-t-2 border-foreground" : ""}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-[#ea580c] text-background text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 font-mono">
                {e.venue}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                stake {e.amount_in} → {e.amount_out}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                #{e.index} · {timeAgo(e.timestamp)}
              </span>
            </div>
            <p className="text-xs font-mono text-foreground leading-relaxed">{e.reasoning}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-mono">
        * testnet figures. each entry is a Reinvested event the agent wrote to the TreasuryVault, reasoning included.
      </p>
    </section>
  )
}
