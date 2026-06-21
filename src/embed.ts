// ── T-09: embedding provider for the RTS fallback ──
// Wire to any provider. Until EMBED_API_KEY is set this throws, and rts.ts degrades
// to zero-dependency keyword recall — so the GATE/spike is never blocked on embeddings.
export async function embed(text: string): Promise<number[]> {
  if (!process.env.EMBED_API_KEY) {
    throw new Error("EMBED_API_KEY not set — rts.ts will use keyword recall instead");
  }
  const r = await fetch(process.env.EMBED_URL ?? "https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.EMBED_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.EMBED_MODEL ?? "text-embedding-3-small",
      input: text,
    }),
  });
  const data: any = await r.json();
  return data.data[0].embedding;
}
