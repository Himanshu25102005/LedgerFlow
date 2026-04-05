"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { easeSmooth } from "./motion-variants";

export function CTASection({ displayFontClass = "" }) {
  return (
    <section className="border-t border-white/[0.06] px-4 py-24 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: easeSmooth }}
        className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-[#12121a] to-indigo-950/40 px-8 py-16 text-center shadow-[0_0_60px_rgba(124,58,237,0.12)]"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-500/15 blur-3xl"
          aria-hidden
        />

        <h2 className={`relative ${displayFontClass} text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl`}>
          Take control of your financial data today.
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-sm text-neutral-400 sm:text-base">
          Sign in with Google and open the dashboard tailored to your role.
        </p>
        <motion.div
          className="relative mt-10"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <Link
            href="/login"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-neutral-900 shadow-lg transition hover:bg-neutral-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Login with Google
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
