import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChallengeCardData } from "../types";

export function ChallengeCard({ challenge, onApply }: { challenge: ChallengeCardData; onApply?: () => void }) {
  return (
    <Card className="w-full flex flex-col hover:border-primary transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge className="mb-2 uppercase text-xs bg-primary text-primary-foreground">{challenge.domain}</Badge>
          {challenge.budgetInr && (
            <Badge className="mb-2 text-xs font-mono bg-secondary text-secondary-foreground">
              ₹{(challenge.budgetInr / 100000).toFixed(1)} Lakhs
            </Badge>
          )}
        </div>
        <CardTitle className="line-clamp-2 leading-tight">{challenge.title}</CardTitle>
        <CardDescription className="line-clamp-3 mt-2">{challenge.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {challenge.deadline && (
          <p className="text-sm text-muted-foreground mt-2">
            Deadline: {new Date(challenge.deadline).toLocaleDateString()}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onApply} className="w-full" disabled={!onApply}>Apply for Pilot</Button>
      </CardFooter>
    </Card>
  );
}