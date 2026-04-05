"use client";

import { motion } from "framer-motion";
import { LogIn, PlusCircle, BarChart3, Sliders } from "lucide-react";
import { staggerContainer, staggerItem, easeSmooth } from "./motion-variants";

const STEPS = [
  {
    step: "01",
    title: "Login securely with OAuth",
    desc: "Sign in with Google and land in a session-aware experience.",
    icon: LogIn,
  },
  {
    step: "02",
    title: "Add financial records",
    desc: "Capture income and expenses with categories and dates that stick.",
    icon: PlusCircle,
  },
  {
    step: "03",
    title: "Analyze insights via dashboard",
    desc: "Summaries, trends, and breakdowns update with your filters.",
    icon: BarChart3,
  },
  {
    step: "04",
    title: "Manage data based on role",
    desc: "Admins govern; analysts read the big picture; viewers stay personal.",
    icon: Sliders,
  },
];

export function HowItWorksSection({ displayFontClass = "" }) {
  return (
    <section className="border-t border-white/[0.06] px-4 py-20 md:px-8">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: easeSmooth }}
          className="mb-14 text-center"
        >
          <h2 className={`${displayFontClass} text-3xl font-bold tracking-tight text-white sm:text-4xl`}>
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-400">
            From first sign-in to role-aware operations—four calm steps.
          </p>
        </motion.div>

        <div className="relative">
          <div
            className="absolute left-[1.35rem] top-8 bottom-8 hidden w-px bg-gradient-to-b from-violet-500/40 via-violet-500/20 to-transparent md:block"
            aria-hidden
          />
        <motion.ul
          className="relative list-none space-y-0"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {STEPS.map(({ step, title, desc, icon: Icon }) => (
            <motion.li
              key={step}
              variants={staggerItem}
              className="relative flex gap-6 pb-12 last:pb-0 md:gap-10"
            >
              <div className="flex shrink-0 flex-col items-center md:w-12">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-500/30 bg-[#12121a] text-xs font-bold text-violet-200 shadow-[0_0_24px_rgba(139,92,246,0.15)]">
                  {step}
                </span>
              </div>
              <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8">
                <div className="mb-3 inline-flex text-violet-300/90">
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className={`${displayFontClass} text-xl font-semibold text-white`}>
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{desc}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
        </div>
      </div>
    </section>
  );
}
