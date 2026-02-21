import type { NormalizedMessage, AIResponse } from "./types";

/**
 * Updates MongoDB and Vector DB with new messages and embeddings.
 * In production: insert message, optionally generate embedding and upsert to vector DB.
 */
export async function updateMemory(
  message: NormalizedMessage,
  aiResponse: AIResponse
): Promise<void> {
  // TODO: Implement MongoDB insert
  // const db = await getMongoClient();
  // await db.collection('messages').insertOne({ ...message, ... })

  // TODO: If aiResponse.should_respond and aiResponse.response:
  // - Insert AI response as message
  // - Generate embedding for message content
  // - Upsert to Vector DB

  // Placeholder: log for dev
  if (process.env.NODE_ENV !== "production") {
    console.log("[Memory] Would persist message:", message.message_id);
    if (aiResponse.should_respond && aiResponse.response) {
      console.log("[Memory] Would persist AI response");
    }
  }
}
