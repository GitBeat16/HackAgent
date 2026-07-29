export interface PitchFormValues {
  startupName: string;
  oneLiner: string;
  industry: string;
  stage: string;
  pitch: string;
}

export const industryOptions = [
  { label: "Logistics & supply chain", value: "logistics" },
  { label: "Healthcare", value: "healthcare" },
  { label: "Fintech", value: "fintech" },
  { label: "Developer tools", value: "devtools" },
  { label: "Climate & energy", value: "climate" },
  { label: "Consumer", value: "consumer" },
  { label: "Other", value: "other" },
];

export const stageOptions = [
  { label: "Pre-seed", value: "pre-seed" },
  { label: "Seed", value: "seed" },
  { label: "Series A", value: "series-a" },
  { label: "Series B+", value: "series-b-plus" },
];
