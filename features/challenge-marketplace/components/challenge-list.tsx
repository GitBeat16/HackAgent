"use client";

import React, { useEffect, useState } from "react";
import { ChallengeCard } from "./challenge-card";
import { fetchOpenChallenges } from "../service";
import type { ChallengeCardData } from "../types";

export function ChallengeList() {
  const [challenges, setChallenges] = useState<ChallengeCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpenChallenges()
      .then(data => setChallenges(data.challenges || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center animate-pulse">Loading Project Marketplace...</div>;
  if (!challenges.length) return <div className="p-8 text-center text-muted-foreground">No active challenges available right now.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {challenges.map(c => (
        <ChallengeCard 
          key={c.id} 
          challenge={c} 
          onApply={() => alert(`Opening proposal form for ${c.id}`)} 
        />
      ))}
    </div>
  );
}
