// Closes the ledger loop: an accepted assignment becomes a bot-authored "✅ Resolved:" record
// posted back to #mutual-aid, which future RTS recall finds (it prefers bot-authored resolution
// records, names the volunteer for content-linkage, and includes the need for relevance).

export interface AcceptContext {
  volunteer: string;
  need_type?: string;
  summary?: string;
}

// Encoded into the Accept button's value so the action handler can rebuild the record.
export function encodeAcceptValue(volunteer: string, need_type: string, summary: string): string {
  return JSON.stringify({ v: volunteer, n: need_type, s: summary });
}

export function parseAcceptValue(value: string): AcceptContext {
  try {
    const o = JSON.parse(value);
    if (o && typeof o === "object" && typeof o.v === "string") {
      return { volunteer: o.v, need_type: o.n, summary: o.s };
    }
  } catch {
    /* legacy plain-string value (just the volunteer name) */
  }
  return { volunteer: value };
}

// Matches the seeded "✅ Resolved:" format so the recall pipeline treats it identically.
export function resolutionRecord(a: AcceptContext): string {
  if (a.need_type && a.summary) {
    return `✅ Resolved: ${a.volunteer} handled a ${a.need_type} request — ${a.summary}`;
  }
  return `✅ Resolved: ${a.volunteer} handled the request.`;
}
