import React from 'react';
import { ChallengeList } from '@/features/challenge-marketplace/components/challenge-list';

export default function MarketplacePage() {
  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Project Marketplace</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Discover outcome-based problem statements from government departments. Submit your proposal to enter the AI evaluation phase and secure a funded pilot.
        </p>
      </div>
      <ChallengeList />
    </div>
  );
}