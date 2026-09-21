import React from 'react';
import { OfficerChallengeForm } from '@/features/challenge-marketplace/components/officer-challenge-form';

export default function NewChallengePage() {
  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Post a Challenge</h1>
        <p className="text-muted-foreground mt-2">
          Define an outcome-based problem statement to attract innovative startup solutions.
        </p>
      </div>
      <OfficerChallengeForm />
    </div>
  );
}
