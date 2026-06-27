"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { RadioTower } from "lucide-react"
import { motion } from "framer-motion"
import { ThemeToggle } from "@/components/theme-toggle"

const LINKS = [
  { label: "Feeds", href: "/feeds" },
  { label: "Datasets", href: "/docs#datasets" },
  { label: "Docs", href: "/docs" },
  { label: "Network", href: "https://testnet.cspr.live/contract-package/dac573fc3a4c9df921013300612cd289d193814e52a72f76abb0f18f04366f46" },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full px-4 pt-4 lg:px-6 lg:pt-6"
    >
      <nav className="w-full border border-foreground/20 bg-background/80 backdrop-blur-sm px-6 py-3 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <RadioTower size={16} strokeWidth={1.5} className="text-[#ea580c]" />
              <span className="text-xs font-mono tracking-[0.2em] uppercase font-bold">
                CLAROS
              </span>
            </motion.div>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-8">
            {LINKS.map((link, i) => {
              const active = pathname === link.href
              return (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className={`text-xs font-mono tracking-widest uppercase transition-colors duration-200 ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </motion.a>
              )
            })}
          </div>

          {/* Right side: GitHub + CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex items-center gap-4"
          >
            <ThemeToggle />
            <a
              href="https://testnet.cspr.live"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:block text-xs font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Explorer
            </a>
            <Link href="/docs">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-foreground text-background px-4 py-2 text-xs font-mono tracking-widest uppercase"
              >
                Start Building
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </nav>
    </motion.div>
  )
}
