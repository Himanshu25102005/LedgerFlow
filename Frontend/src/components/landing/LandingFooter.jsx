"use client";

import Link from "next/link";

export function LandingFooter({ displayFontClass = "" }) {
  return (
    <footer className="border-t border-white/[0.06] px-4 py-12 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
        <div className="text-center sm:text-left">
          <p className={`${displayFontClass} text-lg font-bold text-white`}>
            LedgerFlow
          </p>
          <p className="mt-2 max-w-sm text-sm text-neutral-500">
            Role-based financial insights and management—built for teams that need clarity without
            compromise.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:items-end">
          <Link
            href="/login"
            className="text-sm font-medium text-violet-300 transition hover:text-violet-200"
          >
            Sign in
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-500 transition hover:text-neutral-300"
          >
            GitHub
          </a>
        </div>
      </div>
      <p className="mt-10 text-center text-xs text-neutral-600">
        © {new Date().getFullYear()} LedgerFlow. All rights reserved.
      </p>
    </footer>
  );
}
