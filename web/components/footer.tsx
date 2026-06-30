"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Github } from "lucide-react"
import { ClarosMark } from "@/components/claros-mark"

const ease = [0.22, 1, 0.36, 1] as const

const LINKS = [
  { label: "Feeds", href: "/feeds" },
  { label: "Datasets", href: "/datasets" },
  { label: "Docs", href: "/docs" },
  { label: "Network", href: "/network" },
]

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease }}
      className="w-full border-t-2 border-foreground px-6 py-8 lg:px-12"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <Link href="/" className="flex items-center gap-2">
            <ClarosMark size={16} />
            <span className="text-xs font-mono tracking-[0.2em] uppercase font-bold text-foreground">CLAROS</span>
          </Link>
          <span className="text-[10px] font-mono tracking-widest text-muted-foreground">
            {"VERIFIABLE REAL-WORLD DATA ORACLE · CASPER"}
          </span>
        </div>
        <div className="flex items-center gap-6">
          {LINKS.map((link, i) => {
            const external = link.href.startsWith("http")
            return (
              <motion.a
                key={link.label}
                href={link.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease }}
                className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {link.label}
              </motion.a>
            )
          })}
          <motion.a
            href="https://github.com/HoomanBuilds/claros"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + LINKS.length * 0.06, duration: 0.4, ease }}
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <Github size={16} strokeWidth={1.5} />
          </motion.a>
        </div>
      </div>
    </motion.footer>
  )
}
