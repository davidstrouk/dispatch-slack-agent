import type { NeedClassification, Urgency } from "./types.js";

// ── T-11/T-12: classify a free-text help request → { need_type, urgency, summary } ──
// Swap llmClassify() for Slack AI or your preferred LLM. Falls back to a heuristic so
// the whole pipeline runs end-to-end before any LLM key is wired.
export async function classify(text: string): Promise<NeedClassification> {
  if (process.env.LLM_API_KEY) {
    try {
      return await llmClassify(text);
    } catch {
      /* fall through to heuristic */
    }
  }
  return heuristicClassify(text);
}

async function llmClassify(text: string): Promise<NeedClassification> {
  const prompt = `Classify this mutual-aid request. Reply ONLY with JSON:
{"need_type": one of ["transport","groceries","childcare","medical","housing","other"],
 "urgency": one of ["low","medium","high","critical"],
 "summary": short phrase}
Request: ${JSON.stringify(text)}`;

  // Dependency-free call via fetch (Anthropic shape shown; point LLM_URL elsewhere to swap).
  const r = await fetch(process.env.LLM_URL ?? "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.LLM_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data: any = await r.json();
  const raw = data?.content?.[0]?.text ?? "{}";
  return JSON.parse(raw) as NeedClassification;
}

function heuristicClassify(text: string): NeedClassification {
  const t = text.toLowerCase();
  const need_type = /ride|drive|transport|car|lift|pickup|dialysis|appointment/.test(t)
    ? "transport"
    : /grocer|food|meal|formula|diaper/.test(t)
      ? "groceries"
      : /child|kid|babysit/.test(t)
        ? "childcare"
        : /med|prescription|doctor|nurse|pharmacy/.test(t)
          ? "medical"
          : "other";
  const urgency: Urgency = /now|asap|urgent|emergency|tonight|tomorrow/.test(t)
    ? "high"
    : "medium";
  return { need_type, urgency, summary: text.slice(0, 60) };
}
