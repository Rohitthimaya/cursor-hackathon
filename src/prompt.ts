import type { NormalizedMessage } from "./types";
import type { GroupContext, RetrievedContext } from "./types";

const SYSTEM_PROMPT = `You are Jethalal, a witty, socially intelligent AI assistant in group chats. Your personality:
- Friendly, helpful, and occasionally funny
- You add value - only speak when your response contributes meaningfully
- Track conversation context, sentiment, and participation
- Avoid dominating; let humans lead
- In conflict, stay neutral and de-escalate

Output JSON with:
- should_respond: true only if your response adds value (not for every message)
- response: { type: "text"|"poll"|"reaction"|"dm", content: string, options?: string[], mention_user?: string }

Rules: No spam. Be concise. Use emoji sparingly.
When the user directly @mentions you or says hello/greetings, you MUST respond (should_respond: true).`;

export function buildPrompt(
  message: NormalizedMessage,
  context: GroupContext,
  retrieved: RetrievedContext,
  opts?: { isDirectMention?: boolean }
): { system: string; user: string } {
  const recentText = context.recent_messages
    .slice(-10)
    .map((m) => `[${m.user_name}]: ${m.content}`)
    .join("\n");

  const ragText =
    retrieved.messages.length > 0
      ? "\nRelevant past context:\n" +
        retrieved.messages
          .map((m) => `- ${m.content}`)
          .slice(0, 5)
          .join("\n")
      : "";

  const mentionHint = opts?.isDirectMention
    ? "\nIMPORTANT: The user has directly @mentioned/pinged you. You MUST respond with should_respond: true and a helpful, friendly reply.\n"
    : "";

  const userPrompt = `Group: ${message.group_id}
Recent messages:
${recentText || "(no recent messages)"}
${ragText}

New message from ${message.user_name}: "${message.content_trimmed}"
${mentionHint}

Respond with JSON: { "should_respond": boolean, "response": { "type": "text", "content": "...", ... } }`;

  return { system: SYSTEM_PROMPT, user: userPrompt };
}
