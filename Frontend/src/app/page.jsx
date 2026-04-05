import { Inter, Space_Grotesk } from "next/font/google";
import { LandingPage } from "@/components/landing/LandingPage";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "LedgerFlow — Role-Based Financial Insights & Management",
  description:
    "Track, analyze, and manage financial data with precision. Role-based access for admin, analyst, and viewer.",
};

export default function Home() {
  return (
    <div
      className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className} min-h-screen bg-[#0a0a0a]`}
    >
      <LandingPage displayFontClass={spaceGrotesk.className} />
    </div>
  );
}
