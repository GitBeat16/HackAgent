import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, IndianRupee, ArrowRight } from "lucide-react";
import Link from "next/link";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  domain: string;
  budget_inr: number | null;
  deadline: string | null;
  status: string;
}

interface ChallengeCardProps {
  challenge: Challenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  return (
    <Card className="flex flex-col h-full hover:border-primary/50 transition-colors bg-surface/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between mb-3">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
            {challenge.domain}
          </Badge>
          <Badge tone="outline" className={challenge.status === 'open' ? "text-emerald-500 border-emerald-500/30" : "text-muted-foreground"}>
            {challenge.status.toUpperCase()}
          </Badge>
        </div>
        <CardTitle className="text-xl leading-tight">{challenge.title}</CardTitle>
        <CardDescription className="line-clamp-3 mt-3 text-sm leading-relaxed">
          {challenge.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <IndianRupee className="w-4 h-4 mr-2 opacity-70" />
            <span>Budget: {challenge.budget_inr ? `₹${challenge.budget_inr.toLocaleString()}` : 'To be determined'}</span>
          </div>
          {challenge.deadline && (
            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarDays className="w-4 h-4 mr-2 opacity-70" />
              <span>Closes: {new Date(challenge.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-4 border-t border-border/50">
        <Button asChild className="w-full group" variant="primary">
          <Link href={`/challenges/${challenge.id}`}>
            View & Submit Proposal
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
