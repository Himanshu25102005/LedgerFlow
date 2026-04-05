"use client";

import { motion } from "framer-motion";
import { Crown, Telescope, Eye } from "lucide-react";
import { staggerContainer, staggerItem, easeSmooth } from "./motion-variants";

const ROLES = [
  {
    icon: Crown,
    name: "Admin",
    accent: "from-violet-500/20 to-fuchsia-500/10",
    border: "border-violet-500/25",
    points: ["Full control", "Manage users", "View all data"],
  },
  {
    icon: Telescope,
    name: "Analyst",
    accent: "from-amber-500/15 to-orange-500/10",
    border: "border-amber-500/20",
    points: ["System-wide insights", "Analyze trends", "Read-only analytics"],
  },
  {
    icon: Eye,
    name: "Viewer",
    accent: "from-sky-500/15 to-blue-500/10",
    border: "border-sky-500/25",
    points: ["Personal financial data", "Add your own records", "Focused visibility"],
  },
];

export function RolesSection({ displayFontClass = "" }) {
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
            Roles that match responsibility
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-400">
            LedgerFlow separates what you can see from what you can change—so teams stay aligned
            and accountable.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {ROLES.map(({ icon: Icon, name, accent, border, points }) => (
            <motion.article
              key={name}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25, ease: easeSmooth }}
              className={`relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-b ${accent} p-8 backdrop-blur-sm`}
            >
              <div className="mb-6 inline-flex rounded-xl bg-black/30 p-3 text-white">
                <Icon className="h-7 w-7" strokeWidth={1.25} aria-hidden />
              </div>
              <h3 className={`${displayFontClass} text-2xl font-bold text-white`}>
                {name}
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-neutral-300">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
