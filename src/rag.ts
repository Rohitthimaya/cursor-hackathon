import type { RetrievedContext } from "./types";
import { createEmbedding } from "./embeddings";
import { searchVectors } from "./db/vector";

/**
 * Retrieves relevant past messages from Vector DB for RAG.
 */
export async function retrieveFromVectorDB(
  groupId: string,
  query: string
): Promise<RetrievedContext> {
  const embedding = await createEmbedding(query);
  if (embedding.length === 0) return { messages: [] };

  const results = await searchVectors(groupId, embedding, 5);
  return { messages: results };
}
