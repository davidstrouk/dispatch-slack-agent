// Shared types for Dispatch.

export interface Precedent {
  authorName: string;
  content: string;
  permalink: string;
  channelName: string;
  ts: string;
}

export interface Volunteer {
  name: string;
  available: boolean;
  availabilityWindow: string;
  skills: string[];
  distanceMi: number;
  pastHandled: string[];
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
