import type { LucideIcon } from "lucide-react";
import type { ExecutiveRole } from "@/components/shared/executive-card";

export interface StatDatum {
  label: string;
  value: string;
}

export interface ProcessStep {
  step: string;
  title: string;
  description: string;
}

export interface BoardExecutivePreview {
  name: string;
  role: ExecutiveRole;
  trait: string;
  quote: string;
}

export interface DeliverableFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  title: string;
}

export interface PricingTier {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}
