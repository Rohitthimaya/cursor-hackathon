import type { IncomingMessage, NormalizedMessage } from "./types";

/**
 * Normalizes incoming messages from bots for consistent processing.
 */
export function normalizeMessage(message: IncomingMessage): NormalizedMessage {
  const content = String(message.content || "").trim();
  const content_trimmed = content.slice(0, 2000); // Limit length

  return {
    ...message,
    platform: (message.platform ?? "slack") as "slack" | "telegram" | "whatsapp",
    group_id: String(message.group_id || "").trim(),
    user_id: String(message.user_id || "").trim(),
    user_name: String(message.user_name || message.user_id || "Unknown").trim(),
    content,
    content_trimmed,
    normalized_at: new Date().toISOString(),
    timestamp: message.timestamp || new Date().toISOString(),
    message_id: String(message.message_id || "").trim(),
  };
}
