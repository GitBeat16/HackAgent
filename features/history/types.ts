export interface VersionEntry {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "brass" | "signal" | "success" | "warning";
  changeType: "Report" | "Pitch deck" | "PRD" | "Financials";
}
