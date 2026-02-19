export const ISSUE_STATUSES = [
  { id: "triage", label: "Triage" },
  { id: "planning", label: "Planning" },
  { id: "make", label: "Make" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number]["id"];

export const INITIATIVE_STATUSES = [
  { id: "triage", label: "Triage" },
  { id: "planning", label: "Planning" },
  { id: "make", label: "Make" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
  { id: "paused", label: "Paused" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export type InitiativeStatus = (typeof INITIATIVE_STATUSES)[number]["id"];

export const BOARD_COLUMNS = [
  { id: "triage", label: "TRIAGE" },
  { id: "planning", label: "PLANNING" },
  { id: "make", label: "MAKE" },
  { id: "review", label: "REVIEW" },
  { id: "done", label: "DONE" },
] as const;
