import type { AIResponse, GroupContext } from "./types";

/**
 * Decision engine: validates and adjusts AI response based on social rules.
 * - Prevents spam (don't respond to every message)
 * - Validates response structure
 */
export function decisionEngine(
  aiResponse: Partial<AIResponse>,
  _context: GroupContext
): AIResponse {
  const shouldRespond = Boolean(aiResponse.should_respond);
  const response = aiResponse.response;

  // If AI says don't respond, return minimal response
  if (!shouldRespond) {
    return {
      should_respond: false,
      platform: aiResponse.platform!,
      group_id: aiResponse.group_id!,
    };
  }

  // Validate response structure
  const validType =
    response?.type && ["text", "poll", "reaction", "dm"].includes(response.type);
  const content = response?.content?.trim() || "";

  if (!validType || !content) {
    return {
      should_respond: false,
      platform: aiResponse.platform!,
      group_id: aiResponse.group_id!,
    };
  }

  return {
    should_respond: true,
    platform: aiResponse.platform!,
    group_id: aiResponse.group_id!,
    response: {
      type: response.type as "text" | "poll" | "reaction" | "dm",
      content,
      options: response.options,
      mention_user: response.mention_user,
    },
  };
}
