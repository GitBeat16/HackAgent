/**
 * Turns an upstream failure into something a founder can act on.
 *
 * Errors from the model provider are written for whoever holds the API key,
 * not for the person watching a board debate — they name internal model ids,
 * organization ids and billing URLs. Those belong behind a disclosure, with
 * the surface text saying what happened to the session and what to do next.
 */

export interface BoardErrorCopy {
  title: string;
  description: string;
  /** The original message, for the collapsed technical detail. */
  detail?: string;
}

/** Groq's own wording for the two ceilings it enforces per minute. */
const RATE_LIMITED = /rate limit reached|rate_limit_exceeded|\(429\)/i;
const NOT_CONFIGURED = /GROQ_API_KEY|AI_NOT_CONFIGURED|not been configured/i;
const UNAUTHORIZED = /\(401\)|invalid api key|unauthorized/i;
const TIMED_OUT = /timed out|timeout|aborted/i;

export function boardErrorCopy(message: string): BoardErrorCopy {
  if (RATE_LIMITED.test(message)) {
    return {
      title: "The board is talking faster than your plan allows",
      description:
        "Your API plan caps how many tokens can be used each minute, and this session reached it. " +
        "The board retries on its own — if it stopped here, wait a moment and resume. " +
        "Shorter sessions, fewer seated executives, or a higher tier will avoid it.",
      detail: message,
    };
  }

  if (NOT_CONFIGURED.test(message)) {
    return {
      title: "No API key configured",
      description:
        "Add GROQ_API_KEY to .env.local and restart the dev server. The board cannot convene without it.",
      detail: message,
    };
  }

  if (UNAUTHORIZED.test(message)) {
    return {
      title: "That API key was rejected",
      description:
        "The key in .env.local is missing, expired or revoked. Issue a new one and restart the dev server.",
      detail: message,
    };
  }

  if (TIMED_OUT.test(message)) {
    return {
      title: "The board stalled",
      description: "That turn took too long to come back. Resuming will retry it.",
      detail: message,
    };
  }

  // Unrecognised failures keep their original text: a message we did not
  // anticipate is more useful shown than replaced with something vague.
  return { title: "The board stalled", description: message };
}
