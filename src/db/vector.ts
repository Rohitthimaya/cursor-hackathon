/**
 * Milvus / Zilliz Vector DB client - insert and search
 */

const COLLECTION = "jethalal_messages";

function getBaseUrl(): string | null {
  const url = process.env.VECTOR_DB_URL;
  const key = process.env.VECTOR_DB_API_KEY;
  if (!url || !key) return null;
  return url.replace(/\/$/, "");
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.VECTOR_DB_API_KEY}`,
  };
}

export async function insertVector(entities: Array<{
  group_id: string;
  message_id: string;
  content: string;
  embedding: number[];
  timestamp: string;
  user_id: string;
  user_name: string;
  platform: string;
}>): Promise<boolean> {
  const base = getBaseUrl();
  if (!base || entities.length === 0) return false;

  const url = `${base}/v1/vector/insert`;
  const data = entities.map((e) => ({
    group_id: e.group_id,
    message_id: e.message_id,
    content: e.content.slice(0, 4096),
    embedding: e.embedding,
    timestamp: e.timestamp,
    user_id: e.user_id,
    user_name: e.user_name,
    platform: e.platform,
  }));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        collectionName: COLLECTION,
        data,
      }),
    });
    if (!res.ok) {
      console.error("[Vector] Insert failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[Vector] Insert error:", e);
    return false;
  }
}

export async function searchVectors(
  groupId: string,
  embedding: number[],
  limit = 5
): Promise<Array<{ content: string; timestamp: string; relevance_score?: number }>> {
  const base = getBaseUrl();
  if (!base || embedding.length === 0) return [];

  const url = `${base}/v1/vector/search`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        collectionName: COLLECTION,
        vector: embedding,
        filter: `group_id == "${groupId}"`,
        limit,
        outputFields: ["content", "timestamp"],
      }),
    });
    if (!res.ok) {
      console.error("[Vector] Search failed:", res.status, await res.text());
      return [];
    }
    const json = (await res.json()) as { data?: Array<{ content?: string; timestamp?: string; distance?: number }> };
    const list = json.data || [];
    return list.map((d) => ({
      content: d.content || "",
      timestamp: d.timestamp || "",
      relevance_score: typeof d.distance === "number" ? 1 - Math.min(d.distance, 2) / 2 : undefined,
    }));
  } catch (e) {
    console.error("[Vector] Search error:", e);
    return [];
  }
}
