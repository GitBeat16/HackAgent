import React from 'react';

export default function MyProposalsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">My Proposals</h1>
      <p className="text-muted-foreground">This page lists all your submitted proposals. Click on one to track its status.</p>
      {/* Real app would map over fetchProposals() here */}
    </div>
  );
}
