export interface NotificationOption {
  id: string;
  label: string;
  description: string;
}

/**
 * Which notifications exist is UI configuration, not user data — the
 * user's answers live in `workspace_data.notification_prefs`, keyed by
 * these ids.
 */
export const notificationOptions: NotificationOption[] = [
  {
    id: "session-complete",
    label: "Board session completed",
    description: "Get notified when a live debate finishes and a report is ready.",
  },
  {
    id: "score-change",
    label: "Investment score changes",
    description: "Alert me when a report is regenerated with a new score.",
  },
  {
    id: "weekly-digest",
    label: "Weekly digest",
    description: "A summary of every session run across your workspace.",
  },
  {
    id: "exec-updates",
    label: "New executive personas",
    description: "Let me know when a new agent is added to the board.",
  },
];
