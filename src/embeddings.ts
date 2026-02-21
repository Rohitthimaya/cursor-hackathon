/**
 * Generate embeddings via OpenAI-compatible API (AIML, OpenAI, etc.)
 */

export async function createEmbedding(text: string): Promise<number[]> {
  const base = process.env.AIML_API_BASE_URL || process.env.AIML_API_URL || "https://api.aimlapi.com/v1";
  const url = base.includes("/embeddings") ? base : base.replace(/\/$/, "") + "/embeddings";
  const token = process.env.AIML_API_TOKEN;

  if (!token) {
    return [];
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL || "text-embedding-ada-002",
        input: text.slice(0, 8000),
      }),
    });

    if (!res.ok) {
      console.error("[Embeddings] API error:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const embedding = data.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) return [];
    return embedding;
  } catch (e) {
    console.error("[Embeddings] Error:", e);
    return [];
  }
}
