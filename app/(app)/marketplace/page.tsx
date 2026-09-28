import { createClient } from "@/lib/supabase/server";
import { MarketplaceSearch } from "@/features/challenge-marketplace/components/marketplace-search";
import { requireUser } from "@/lib/server/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Challenge Marketplace | HackAgent",
};

export default async function MarketplacePage() {
  const { user } = await requireUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch challenges", error);
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Government Challenge Marketplace</h1>
        <p className="text-muted-foreground mt-2">
          Discover outcome-based problem statements from government departments. 
          Submit your proposal to qualify for a pilot and funding.
        </p>
      </div>

      {!challenges || challenges.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">No open challenges at the moment. Check back later.</p>
        </div>
      ) : (
        <MarketplaceSearch initialChallenges={challenges} />
      )}
    </div>
  );
}
