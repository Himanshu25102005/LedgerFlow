"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { fadeSlideUp, staggerContainer, easeSmooth } from "./motion-variants";

export function HeroSection({ displayFontClass = "" }) {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:pb-28 sm:pt-32 md:px-8">
      <div
        className="pointer-events-none absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-violet-600/15 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 top-40 h-[360px] w-[360px] rounded-full bg-blue-600/10 blur-[90px]"
        aria-hidden
      />

      <motion.div
        className="relative mx-auto max-w-4xl text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={fadeSlideUp}
          className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-violet-300/80 sm:text-sm"
        >
          Finance · Roles · Control
        </motion.p>

        <motion.h1
          variants={fadeSlideUp}
          className={`${displayFontClass} text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl`}
        >
          <span className="bg-gradient-to-br from-white via-white to-white/70 bg-clip-text text-transparent">
            LedgerFlow
          </span>
        </motion.h1>

        <motion.p
          variants={fadeSlideUp}
          className="mt-5 text-lg font-medium text-neutral-300 sm:text-xl md:text-2xl"
        >
          Role-Based Financial Insights &amp; Management System
        </motion.p>

        <motion.p
          variants={fadeSlideUp}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-400 sm:text-lg"
        >
          Track, analyze, and manage financial data with precision and control.
        </motion.p>

        <motion.div
          variants={fadeSlideUp}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
            <Link
              href="/login"
              className="inline-flex min-h-12 min-w-[180px] items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500"
            >
              Get Started
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 min-w-[180px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 text-sm font-semibold text-neutral-100 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10"
            >
              View Dashboard
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
