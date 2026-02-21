import type { IncomingMessage, NormalizedMessage } from "./types";

/** Platform-specific field aliases (e.g. Telegram may send "message" instead of "content") */
function extractContent(msg: Record<string, unknown>): string {
  const raw =
    msg.content ?? msg.message ?? msg.text ?? msg.body ?? "";
  return String(raw).trim();
}

/**
 * Normalizes incoming messages from bots for consistent processing.
 * Handles platform-specific field names (Telegram, Slack, WhatsApp).
 */
export function normalizeMessage(message: IncomingMessage & Record<string, unknown>): NormalizedMessage {
  const m = message as Record<string, unknown>;
  const content = extractContent(m) || String(message.content || "").trim();
  const content_trimmed = content.slice(0, 2000); // Limit length

  return {
    ...message,
    platform: (message.platform ?? "slack") as "slack" | "telegram" | "whatsapp" | "discord",
    group_id: String(message.group_id || "").trim(),
    user_id: String(message.user_id ?? m.user ?? "").trim() || "unknown",
    user_name: String(message.user_name ?? m.user ?? message.user_id ?? "Unknown").trim(),
    content,
    content_trimmed,
    normalized_at: new Date().toISOString(),
    timestamp: message.timestamp || new Date().toISOString(),
    message_id: String(message.message_id ?? m.id ?? "").trim(),
  };
}
