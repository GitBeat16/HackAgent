import type { ExecutiveRole } from "@/components/shared/executive-card";
import type { AvatarPresence } from "@/components/ui/avatar";

export interface ExecutiveProfile {
  id: string;
  name: string;
  role: ExecutiveRole;
  trait: string;
  quote: string;
  bio: string;
  focusAreas: string[];
  presence: AvatarPresence;
  sessionsRun: number;
  agreementRate: number;
}
