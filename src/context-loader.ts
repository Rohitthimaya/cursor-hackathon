import type { GroupContext } from "./types";
import { getMongoClient } from "./db/mongo";

/**
 * Loads conversation context from MongoDB for a group.
 */
export async function loadContext(groupId: string): Promise<GroupContext> {
  const db = await getMongoClient();
  if (!db) {
    return {
      group_id: groupId,
      recent_messages: [],
      participant_stats: {},
      sentiment_summary: undefined,
    };
  }

  try {
    const messages = await db
      .collection("messages")
      .find({ group_id: groupId })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    const recent_messages = messages.map((m) => ({
      user_name: m.user_name || "Unknown",
      content: m.content || "",
      timestamp: m.timestamp || "",
    }));

    const participant_stats: Record<string, { message_count: number; last_active: string }> = {};
    for (const m of messages) {
      const uid = m.user_id || m.user_name || "unknown";
      if (!participant_stats[uid]) {
        participant_stats[uid] = { message_count: 0, last_active: m.timestamp || "" };
      }
      participant_stats[uid].message_count += 1;
    }

    return {
      group_id: groupId,
      recent_messages,
      participant_stats,
      sentiment_summary: undefined,
    };
  } catch (e) {
    console.error("[Context] MongoDB load error:", e);
    return {
      group_id: groupId,
      recent_messages: [],
      participant_stats: {},
      sentiment_summary: undefined,
    };
  }
}
