"use client";

import { HeroSection } from "./HeroSection";
import { FeaturesSection } from "./FeaturesSection";
import { RolesSection } from "./RolesSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { DashboardPreviewSection } from "./DashboardPreviewSection";
import { CTASection } from "./CTASection";
import { LandingFooter } from "./LandingFooter";

export function LandingPage({ displayFontClass = "" }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <main id="main">
        <HeroSection displayFontClass={displayFontClass} />
        <FeaturesSection displayFontClass={displayFontClass} />
        <RolesSection displayFontClass={displayFontClass} />
        <HowItWorksSection displayFontClass={displayFontClass} />
        <DashboardPreviewSection displayFontClass={displayFontClass} />
        <CTASection displayFontClass={displayFontClass} />
        <LandingFooter displayFontClass={displayFontClass} />
      </main>
    </div>
  );
}
