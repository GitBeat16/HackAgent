import { z } from "zod";

export const proposalSchema = z.object({
  solutionType: z.enum(["App Generation", "Service Proposal"]),
  architecture: z.string().min(50).max(5000),
  timeline: z.string().min(1).max(100),
  cost: z.string().min(1).max(50),
  pastExperience: z.string().min(10).max(5000),
  dataProtectionAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the data protection declaration."
  }),
});

export function sanitiseForPrompt(input: string): string {
  // Strip common LLM injection tokens and limit length
  let sanitized = input
    .replace(/<system>/gi, '')
    .replace(/<\/system>/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/System:/gi, '')
    .trim();
  
  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000);
  }
  
  return sanitized;
}
