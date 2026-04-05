"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { easeSmooth } from "./motion-variants";

export function DashboardPreviewSection({ displayFontClass = "" }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [28, -28]);

  return (
    <section ref={ref} className="border-t border-white/[0.06] px-4 py-20 md:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: easeSmooth }}
          className="mb-12 text-center"
        >
          <h2 className={`${displayFontClass} text-3xl font-bold tracking-tight text-white sm:text-4xl`}>
            Dashboard preview
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-400">
            A glance at the bento-style surface—structured cards, filters, and calm hierarchy.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: easeSmooth }}
          className="relative mx-auto overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#121018] to-[#0a0a0f] p-1 shadow-[0_0_80px_rgba(88,28,135,0.12)]"
        >
          <motion.div style={{ y }} className="will-change-transform">
          <div className="rounded-[1.35rem] bg-[#0c0c10]/90 p-4 sm:p-6 md:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Overview</p>
                <p className={`${displayFontClass} text-lg font-semibold text-white`}>
                  Financial Summary
                </p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-300">
                  All time
                </span>
                <span className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200">
                  Categories
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Income", value: "$24,580.00", tone: "text-emerald-400/90" },
                { label: "Expense", value: "$18,240.00", tone: "text-neutral-300" },
                { label: "Net", value: "$6,340.00", tone: "text-violet-300" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-white/[0.06] bg-black/40 px-4 py-4"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                    {row.label}
                  </p>
                  <p className={`${displayFontClass} mt-2 text-xl font-semibold tabular-nums ${row.tone}`}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="min-h-[140px] rounded-xl border border-white/[0.06] bg-gradient-to-br from-violet-950/40 to-transparent p-4">
                <p className="text-xs font-medium text-neutral-400">Category breakdown</p>
                <div className="mt-4 space-y-2">
                  {["Operations", "Payroll", "Cloud"].map((c, i) => (
                    <div key={c} className="flex items-center gap-2">
                      <div
                        className="h-2 flex-1 rounded-full bg-white/10"
                        style={{ width: `${100 - i * 22}%` }}
                      />
                      <span className="text-xs text-neutral-500">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="min-h-[140px] rounded-xl border border-white/[0.06] bg-black/30 p-4">
                <p className="text-xs font-medium text-neutral-400">Monthly trend</p>
                <div className="mt-6 flex h-16 items-end justify-between gap-1 px-1">
                  {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
                    <div
                      key={i}
                      className="w-full max-w-[14%] rounded-t bg-gradient-to-t from-violet-600/50 to-violet-400/20"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
