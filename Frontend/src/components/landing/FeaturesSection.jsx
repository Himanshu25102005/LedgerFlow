"use client";

import { motion } from "framer-motion";
import {
  Wallet,
  Shield,
  LineChart,
  Lock,
  LayoutDashboard,
  SlidersHorizontal,
} from "lucide-react";
import { staggerContainer, staggerItem, easeSmooth } from "./motion-variants";

const FEATURES = [
  {
    icon: Wallet,
    title: "Financial Tracking",
    desc: "Income, expenses, and balances in one disciplined ledger.",
  },
  {
    icon: Shield,
    title: "Role-Based Access Control",
    desc: "Every action respects who you are in the organization.",
  },
  {
    icon: LineChart,
    title: "Insights & Analytics",
    desc: "Trends and categories surfaced for faster decisions.",
  },
  {
    icon: Lock,
    title: "Secure Data Handling",
    desc: "Session-backed flows built for trust at every step.",
  },
  {
    icon: LayoutDashboard,
    title: "Admin Management Panel",
    desc: "Oversight for users and records when full control is required.",
  },
  {
    icon: SlidersHorizontal,
    title: "Smart Filtering System",
    desc: "Date ranges and categories that keep every view coherent.",
  },
];

export function FeaturesSection({ displayFontClass = "" }) {
  return (
    <section className="border-t border-white/[0.06] px-4 py-20 md:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: easeSmooth }}
          className="mb-14 text-center"
        >
          <h2 className={`${displayFontClass} text-3xl font-bold tracking-tight text-white sm:text-4xl`}>
            Built for clarity
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-400">
            Everything you need to run a serious finance workflow—without the noise.
          </p>
        </motion.div>

        <motion.ul
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <motion.li
              key={title}
              variants={staggerItem}
              className="group relative"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.25, ease: easeSmooth }}
                className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-none backdrop-blur-md transition-colors hover:border-violet-500/20 hover:bg-white/[0.05]"
              >
                <div className="mb-4 inline-flex rounded-xl bg-violet-500/10 p-3 text-violet-300">
                  <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className={`${displayFontClass} text-lg font-semibold text-white`}>
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{desc}</p>
              </motion.div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
