import type { Metadata } from "next";
import { Pricing } from "@/features/landing/components/pricing";
import { Faq } from "@/features/landing/components/faq";
import { CtaBanner } from "@/features/landing/components/cta-banner";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="pt-8">
      <Pricing />
      <Faq />
      <CtaBanner />
    </div>
  );
}
