import {
  Gavel,
  ClipboardList,
  LineChart,
  Calculator,
  Presentation,
  Map,
  FileText,
  ScrollText,
} from "lucide-react";
import type {
  StatDatum,
  ProcessStep,
  BoardExecutivePreview,
  DeliverableFeature,
  Testimonial,
  PricingTier,
  FaqItem,
} from "./types";

export const heroStats: StatDatum[] = [
  { label: "Pitches evaluated", value: "14,208" },
  { label: "Avg. time to report", value: "6 min" },
  { label: "Executive debates run today", value: "312" },
];

export const processSteps: ProcessStep[] = [
  {
    step: "01",
    title: "Submit your pitch",
    description: "Paste a one-pager, upload a deck, or just describe the idea in plain language.",
  },
  {
    step: "02",
    title: "Watch the board debate",
    description:
      "Eight AI executives argue your idea from their own seat — growth, risk, product, legal — live and on the record.",
  },
  {
    step: "03",
    title: "Walk away with a report",
    description:
      "An investment decision, SWOT, market research, financial model, and a roadmap — the packet a real board takes weeks to produce.",
  },
];

export const boardExecutives: BoardExecutivePreview[] = [
  {
    name: "Elena Vasquez",
    role: "CEO Agent",
    trait: "Decisive",
    quote: "Give me the one metric that matters and I'll tell you if this works.",
  },
  {
    name: "Marcus Webb",
    role: "CFO Agent",
    trait: "Risk-averse",
    quote: "Show me the burn rate before you show me the vision.",
  },
  {
    name: "Priya Nair",
    role: "CTO Agent",
    trait: "Builds fast",
    quote: "I don't care about your roadmap. I care if it ships.",
  },
  {
    name: "Jonah Kessler",
    role: "VC Agent",
    trait: "Term-sheet minded",
    quote: "What's the exit, and who's already said no to this?",
  },
  {
    name: "Aiko Tanaka",
    role: "CMO Agent",
    trait: "Story-driven",
    quote: "Nobody invests in a feature. They invest in a narrative.",
  },
  {
    name: "Diane Okafor",
    role: "Legal Agent",
    trait: "Reads the fine print",
    quote: "Compliance isn't a blocker. It's what keeps you fundable later.",
  },
];

export const deliverables: DeliverableFeature[] = [
  { icon: Gavel, title: "Investment decision", description: "A clear yes, no, or conditional — with the reasoning behind it." },
  { icon: ClipboardList, title: "SWOT analysis", description: "Strengths, weaknesses, opportunities, and threats, scored by dimension." },
  { icon: LineChart, title: "Market research", description: "Sizing, competitors, and positioning, pressure-tested by the board." },
  { icon: Calculator, title: "Financial analysis", description: "Unit economics and a runway model built from your own assumptions." },
  { icon: Presentation, title: "Pitch deck", description: "A founder-ready deck, restructured around what the board actually asked." },
  { icon: Map, title: "Product roadmap", description: "The next two quarters, sequenced by what the board flagged as urgent." },
  { icon: FileText, title: "PRD", description: "A build-ready spec for the feature the board thinks you should ship first." },
  { icon: ScrollText, title: "Executive report", description: "Everything above, bound into one packet you can forward to a real investor." },
];

export const testimonials: Testimonial[] = [
  {
    quote:
      "The board caught a churn problem in our retention model that we'd missed for two straight quarters. Uncomfortable. Correct.",
    name: "Sam Reyes",
    title: "Founder, Loadbay",
  },
  {
    quote:
      "I expected a rubber stamp. Instead the CFO agent picked apart our CAC payback until we fixed it before our real board meeting.",
    name: "Priya Chandran",
    title: "Founder, Fieldnote",
  },
  {
    quote: "Six minutes for a report that would've taken our advisors a week. We use it before every real pitch now.",
    name: "Tobias Lindgren",
    title: "Founder, Marrow Health",
  },
];

export const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/month",
    description: "Bring one idea to the board and see what it can do.",
    features: ["1 pitch per month", "Full board debate", "Investment decision + SWOT"],
    ctaLabel: "Start free",
  },
  {
    name: "Founder",
    price: "$49",
    cadence: "/month",
    description: "For founders actively fundraising or iterating.",
    features: [
      "Unlimited pitches",
      "Full executive report packet",
      "Financial model + pitch deck export",
      "Version history",
    ],
    highlighted: true,
    ctaLabel: "Start Founder plan",
  },
  {
    name: "Studio",
    price: "$199",
    cadence: "/month",
    description: "For accelerators and studios running many teams through the board.",
    features: ["Everything in Founder", "5 team seats", "Priority board scheduling", "API access"],
    ctaLabel: "Talk to us",
  },
];

export const faqItems: FaqItem[] = [
  {
    question: "Are the executives real people?",
    answer:
      "No. Every executive is an AI persona with a consistent point of view — none of them represent or impersonate a real investor, advisor, or public figure.",
  },
  {
    question: "Is my idea kept private?",
    answer:
      "Your pitch is only used to generate your board session and report. It isn't shared with other founders or used to evaluate anyone else's idea.",
  },
  {
    question: "Can I choose which executives evaluate my pitch?",
    answer:
      "Yes — the Executives page lets you swap in or out of the default eight before you start a session, so you can, for example, weight a session toward Legal and Finance.",
  },
  {
    question: "Can I export the report?",
    answer: "Every report exports as a shareable packet, so you can forward it to a real investor or co-founder.",
  },
  {
    question: "What happens if the board disagrees?",
    answer:
      "Disagreement is kept, not smoothed over. Reports show where executives split and why, instead of collapsing to a single average score.",
  },
];
