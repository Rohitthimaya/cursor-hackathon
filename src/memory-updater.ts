import type { NormalizedMessage, AIResponse } from "./types";
import { getMongoClient } from "./db/mongo";
import { createEmbedding } from "./embeddings";
import { insertVector } from "./db/vector";

/**
 * Updates MongoDB and Vector DB with new messages and embeddings.
 */
export async function updateMemory(
  message: NormalizedMessage,
  aiResponse: AIResponse
): Promise<void> {
  const db = await getMongoClient();

  // 1. Store user message in MongoDB
  const userDoc = {
    platform: message.platform,
    group_id: message.group_id,
    user_id: message.user_id,
    user_name: message.user_name,
    content: message.content,
    timestamp: message.timestamp,
    message_id: message.message_id,
    type: "user",
    created_at: new Date().toISOString(),
  };

  if (db) {
    try {
      await db.collection("messages").insertOne(userDoc);
      console.log("[Memory] MongoDB: saved user message", message.message_id);
    } catch (e) {
      console.error("[Memory] MongoDB insert error:", e);
    }
  }

  // 2. If AI responded, store AI message in MongoDB
  if (aiResponse.should_respond && aiResponse.response?.content && db) {
    const aiDoc = {
      platform: aiResponse.platform,
      group_id: aiResponse.group_id,
      user_id: "jethalal",
      user_name: "Jethalal",
      content: aiResponse.response.content,
      timestamp: new Date().toISOString(),
      message_id: `ai_${Date.now()}`,
      type: "ai",
      created_at: new Date().toISOString(),
    };
    try {
      await db.collection("messages").insertOne(aiDoc);
      console.log("[Memory] MongoDB: saved AI response");
    } catch (e) {
      console.error("[Memory] MongoDB AI insert error:", e);
    }
  }

  // 3. Store embeddings in Vector DB (user message + AI response if any)
  const toEmbed: Array<{ content: string; message_id: string }> = [
    { content: message.content, message_id: message.message_id },
  ];
  if (aiResponse.should_respond && aiResponse.response?.content) {
    toEmbed.push({
      content: aiResponse.response.content,
      message_id: `ai_${Date.now()}`,
    });
  }

  for (const item of toEmbed) {
    const embedding = await createEmbedding(item.content);
    if (embedding.length > 0) {
      const ok = await insertVector([
        {
          group_id: message.group_id,
          message_id: item.message_id,
          content: item.content,
          embedding,
          timestamp: new Date().toISOString(),
          user_id: item.message_id.startsWith("ai_") ? "jethalal" : message.user_id,
          user_name: item.message_id.startsWith("ai_") ? "Jethalal" : message.user_name,
          platform: message.platform,
        },
      ]);
      if (ok) console.log("[Memory] Vector DB: saved embedding for", item.message_id);
    }
  }
}
