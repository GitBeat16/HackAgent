export interface MarketSizeSlice {
  name: string;
  value: number;
}

export interface Competitor {
  name: string;
  segment: string;
  funding: string;
  strength: "Low" | "Medium" | "High";
}

export interface TrendPoint {
  year: string;
  marketSize: number;
}
