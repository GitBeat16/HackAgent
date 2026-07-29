import { getInitials, cn } from "@/lib/utils";
import { AvatarFallback, AvatarPresenceRing } from "@/components/ui/avatar";
import type { SeatedExecutive } from "@/features/boardroom/types";

const voteDot = {
  yes: "bg-success",
  no: "bg-destructive",
  conditional: "bg-warning",
} as const;

const voteLabel = { yes: "Voted yes", no: "Voted no", conditional: "Voted conditional" } as const;

/**
 * The board as a single row of seats.
 *
 * This used to be a 4-column grid of full cards, which put a seven-person
 * board into two rows with a hole in the bottom-right and pushed the
 * transcript — the thing anyone actually comes here to read — below the fold.
 * A flex row wraps at whatever count the roster happens to be and leaves no
 * empty cell, and the seats are small enough to stay pinned above the
 * conversation for the whole session.
 *
 * Vote outcome is a colored dot with an accessible label rather than a badge:
 * at this size a badge doubled the height of every seat for information that
 * is repeated in full in the consensus panel.
 */
export function SeatingGrid({ executives }: { executives: SeatedExecutive[] }) {
  return (
    <ul className="flex flex-wrap items-start justify-center gap-x-1 gap-y-3 sm:justify-start">
      {executives.map((exec) => {
        const isSpeaking = exec.presence === "speaking";
        return (
          <li
            key={exec.id}
            className={cn(
              "flex w-[5.5rem] flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-center transition-colors duration-200",
              isSpeaking && "bg-signal/10",
            )}
          >
            <div className="relative">
              <AvatarPresenceRing presence={exec.presence} size="md">
                <AvatarFallback className="text-xs">{getInitials(exec.name)}</AvatarFallback>
              </AvatarPresenceRing>
              {exec.vote && (
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background",
                    voteDot[exec.vote],
                  )}
                  // The dot is the only place the vote appears in this row, so
                  // it needs a text equivalent rather than `aria-hidden`.
                  role="img"
                  aria-label={voteLabel[exec.vote]}
                />
              )}
            </div>
            <div className="min-w-0">
              {/* Full names overflow an 88px seat, so they clip to one line —
                  the role beneath is what distinguishes the seats at a glance. */}
              <p className="truncate text-[0.7rem] font-medium leading-tight text-foreground">{exec.name}</p>
              <p className="truncate text-[0.65rem] leading-tight text-muted-foreground">
                {exec.role.replace(/\s*Agent$/, "")}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
