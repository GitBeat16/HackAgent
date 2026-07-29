/** Default workspace payloads seeded on first access for a new user. */

export const defaultKanban = [
  {
    id: "backlog",
    title: "Backlog",
    cards: [
      { id: "k1", title: "Draft usage-based pricing PRD", tag: "Product", assignee: "You" },
      { id: "k2", title: "Follow up with Research Agent on TAM source", tag: "Research", assignee: "You" },
      { id: "k3", title: "Line up 2nd engineering hire", tag: "Hiring", assignee: "You" },
    ],
  },
  {
    id: "in-progress",
    title: "In progress",
    cards: [
      { id: "k4", title: "Revise CAC payback model for CFO Agent", tag: "Finance", assignee: "You" },
      { id: "k5", title: "Rebuild traction slide with Q2 cohort data", tag: "Pitch deck", assignee: "You" },
    ],
  },
  {
    id: "review",
    title: "In review",
    cards: [{ id: "k6", title: "Legal Agent review: multi-state compliance", tag: "Legal", assignee: "Diane Okafor" }],
  },
  {
    id: "done",
    title: "Done",
    cards: [
      { id: "k7", title: "Fieldnote report finalized", tag: "Reports", assignee: "You" },
      { id: "k8", title: "Board session scheduled for Loadbay", tag: "Boardroom", assignee: "You" },
    ],
  },
];

export const defaultFinancials = {
  metrics: [
    { label: "MRR", value: "$38.2K", trend: { value: 14, direction: "up", label: "vs last month" } },
    { label: "Burn rate", value: "$61K/mo", trend: { value: 4, direction: "down", label: "vs last month" } },
    { label: "Runway", value: "17 mo", trend: { value: 2, direction: "up", label: "mo added" } },
    { label: "CAC : LTV", value: "1 : 4.2", trend: { value: 6, direction: "up", label: "vs last quarter" } },
  ],
  revenueExpense: [
    { month: "Feb", revenue: 21, expense: 54 },
    { month: "Mar", revenue: 24, expense: 55 },
    { month: "Apr", revenue: 27, expense: 58 },
    { month: "May", revenue: 31, expense: 59 },
    { month: "Jun", revenue: 34, expense: 60 },
    { month: "Jul", revenue: 38, expense: 61 },
  ],
  capTable: [
    { holder: "Founders", role: "Common", ownership: 62 },
    { holder: "Seed investors", role: "Preferred", ownership: 24 },
    { holder: "Employee option pool", role: "Common (options)", ownership: 10 },
    { holder: "Advisors", role: "Common", ownership: 4 },
  ],
};

export const defaultMarketResearch = {
  marketSizing: [
    { name: "SOM — Serviceable obtainable", value: 60 },
    { name: "SAM — Serviceable addressable", value: 480 },
    { name: "TAM — Total addressable", value: 4200 },
  ],
  competitors: [
    { name: "Convoy Freight Co.", segment: "National brokerage", funding: "$260M raised", strength: "High" },
    { name: "RouteWise", segment: "Regional carrier tools", funding: "$18M raised", strength: "Medium" },
    { name: "Haulr", segment: "Owner-operator app", funding: "$4M raised", strength: "Low" },
    { name: "Freightline Direct", segment: "Enterprise shipper software", funding: "$95M raised", strength: "Medium" },
  ],
  marketTrend: [
    { year: "2022", marketSize: 3100 },
    { year: "2023", marketSize: 3450 },
    { year: "2024", marketSize: 3780 },
    { year: "2025", marketSize: 3990 },
    { year: "2026", marketSize: 4200 },
  ],
};

export const defaultStartupHealth = {
  healthScore: 74,
  healthDimensions: [
    { dimension: "Team", score: 82 },
    { dimension: "Product", score: 76 },
    { dimension: "Market", score: 71 },
    { dimension: "Financials", score: 68 },
    { dimension: "Traction", score: 74 },
  ],
  healthFlags: [
    {
      id: "f1",
      title: "CAC payback trending up",
      description: "Payback period moved from 7 to 9 months over the last quarter — worth revisiting acquisition channels.",
      severity: "warning",
    },
    {
      id: "f2",
      title: "Single technical founder",
      description: "No second engineering hire yet. Flagged by the CTO Agent as a key-person risk ahead of Series A.",
      severity: "warning",
    },
    {
      id: "f3",
      title: "Retention holding steady",
      description: "90-day retention has stayed above 85% for three consecutive cohorts.",
      severity: "info",
    },
  ],
};

export const defaultPrdDocument = [
  {
    id: "overview",
    title: "Overview",
    content:
      "Build a usage-based pricing tier for Loadbay so take-rate scales with match volume instead of a flat subscription. The board flagged this as the fastest lever to fix CAC payback.",
  },
  {
    id: "problem",
    title: "Problem statement",
    content:
      "Flat subscription pricing under-charges high-volume carriers and over-charges low-volume ones, distorting CAC payback across the customer base.",
  },
  {
    id: "goals",
    title: "Goals",
    content: "Cut blended CAC payback from 9 months to under 6. Keep pricing simple enough to explain in one sentence during a sales call.",
  },
  {
    id: "requirements",
    title: "Requirements",
    content:
      "Meter matched loads per carrier account. Support a hybrid base-plus-usage model. Migrate existing subscribers without a forced re-signup.",
  },
  {
    id: "non-goals",
    title: "Non-goals",
    content: "This phase does not cover enterprise custom contracts or multi-entity billing — those stay on the roadmap for Q4.",
  },
  {
    id: "success-metrics",
    title: "Success metrics",
    content: "CAC payback under 6 months within two billing cycles of launch. Less than 3% involuntary churn from the pricing migration.",
  },
];

export const defaultPitchDeck = [
  { id: "s1", index: 1, title: "Loadbay", bullets: ["Freight-matching marketplace for regional carriers", "Seed · Raising $1.8M"] },
  { id: "s2", index: 2, title: "The problem", bullets: ["Regional carriers wait 4+ hours for shipper quotes", "Big brokers price them out of urgent loads"] },
  { id: "s3", index: 3, title: "The solution", bullets: ["Real-time matching engine", "Average time-to-quote: 11 minutes"] },
  { id: "s4", index: 4, title: "Market size", bullets: ["$4.2B TAM in regional freight brokerage", "$480M SAM in target corridor states"] },
  { id: "s5", index: 5, title: "Traction", bullets: ["$38.2K MRR, up 14% month over month", "96% weekly retention among pilot carriers"] },
  { id: "s6", index: 6, title: "Business model", bullets: ["8% take rate per matched load", "Expanding to invoicing and factoring"] },
  { id: "s7", index: 7, title: "Team", bullets: ["Founder: 6 years in utility & freight contracting", "2 engineers, 1 ops lead"] },
  { id: "s8", index: 8, title: "The ask", bullets: ["Raising $1.8M seed", "18 months runway to Series A metrics"] },
];

export const defaultNotificationPrefs = {
  "session-complete": true,
  "score-change": true,
  "weekly-digest": false,
  "exec-updates": false,
};

export const defaultActivityEvents = [
  {
    title: "Fieldnote report finalized",
    description: "CFO Agent flagged CAC payback at 14 months — resolved after the founder revised pricing.",
    tone: "success",
    change_type: "Report",
  },
  {
    title: "Loadbay board session started",
    description: "6 of 8 executives seated. VC Agent and Legal Agent still reviewing the deck.",
    tone: "signal",
    change_type: "Report",
  },
  {
    title: "Greenline scored 45/100",
    description: "Board split 3–5 against — market timing cited as the primary risk.",
    tone: "warning",
    change_type: "Report",
  },
  {
    title: "New executive persona added",
    description: "Growth Agent is now available to add to future board sessions.",
    tone: "brass",
    change_type: "PRD",
  },
];

export const defaultHistoryEvents = [
  {
    title: "Fieldnote report regenerated",
    description: "Investment score moved from 74 to 82 after the founder revised pricing tiers.",
    tone: "success",
    change_type: "Report",
  },
  {
    title: "Pitch deck v3 published",
    description: "Traction slide rebuilt with Q2 cohort data at the CMO Agent's request.",
    tone: "signal",
    change_type: "Pitch deck",
  },
  {
    title: "PRD v2: usage-based pricing",
    description: "Non-goals section added to scope out enterprise contracts for this phase.",
    tone: "brass",
    change_type: "PRD",
  },
  {
    title: "Financial model revised",
    description: "CAC payback assumptions updated after CFO Agent flagged an optimistic churn rate.",
    tone: "warning",
    change_type: "Financials",
  },
  {
    title: "Fieldnote report v1 generated",
    description: "Initial board session completed. Score: 74/100.",
    tone: "brass",
    change_type: "Report",
  },
];
