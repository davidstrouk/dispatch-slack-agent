// Shared types for Dispatch.

export interface Precedent {
  authorName: string;
  content: string;
  permalink: string;
  channelName: string;
  ts: string;
  isAuthorBot?: boolean; // true when the recalled message was posted by a bot (e.g. seeded history)
}

export interface Volunteer {
  name: string;
  available: boolean;
  availabilityWindow: string;
  skills: string[];
  distanceMi: number;
  pastHandled: string[];
  recentlyAssigned?: boolean; // fairness signal — true = carrying a recent load
}

export type Urgency = "low" | "medium" | "high" | "critical";

export interface NeedClassification {
  need_type: string; // transport | groceries | childcare | medical | housing | other
  urgency: Urgency;
  summary: string;
}

export interface Match {
  volunteer: Volunteer;
  reason: string;
  precedent: Precedent | null;
}
