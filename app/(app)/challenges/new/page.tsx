import { requireUser } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { OfficerChallengeForm } from "@/features/challenge-marketplace/components/officer-challenge-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "New Challenge | HackAgent",
};

export default async function NewChallengePage() {
  const { user } = await requireUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  
  if (profile?.role !== 'department_officer' && profile?.role !== 'platform_admin') {
    return (
      <div className="container py-8 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-destructive">Unauthorized</h1>
        <p className="text-muted-foreground mt-4">Only Government Officers can post challenges.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Post a New Challenge</h1>
        <p className="text-muted-foreground mt-2">
          Define an outcome-based problem statement. Startups will pitch technical solutions to solve this.
        </p>
      </div>
      <OfficerChallengeForm />
    </div>
  );
}
