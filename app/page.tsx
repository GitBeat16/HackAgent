import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/layout/marketing-navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/features/landing/components/hero";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { ExecutivesShowcase } from "@/features/landing/components/executives-showcase";
import { FeaturesGrid } from "@/features/landing/components/features-grid";
import { Testimonials } from "@/features/landing/components/testimonials";
import { Pricing } from "@/features/landing/components/pricing";
import { Faq } from "@/features/landing/components/faq";
import { CtaBanner } from "@/features/landing/components/cta-banner";

export const metadata: Metadata = {
  title: "BoardroomAI — Pitch to a virtual board of AI executives",
  description:
    "Eight AI executives debate your startup live, then hand you the investment decision, financials, and roadmap a real board takes weeks to produce.",
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ExecutivesShowcase />
        <FeaturesGrid />
        <Testimonials />
        <Pricing />
        <Faq />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
