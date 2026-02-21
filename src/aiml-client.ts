import type { AIResponse, Platform } from "./types";

/**
 * Calls AIML API (or any LLM API) to generate Jethalal's response.
 * Configure AIML_API_TOKEN and AIML_API_BASE_URL in .env
 */
export async function callAIMLAPI(
  systemPrompt: string,
  userPrompt: string,
  platform: Platform,
  groupId: string
): Promise<Partial<AIResponse>> {
  const base = process.env.AIML_API_BASE_URL || process.env.AIML_API_URL || "https://api.aimlapi.com/v1";
  const apiUrl = base.includes("/chat/completions") ? base : base.replace(/\/$/, "") + "/chat/completions";
  const token = process.env.AIML_API_TOKEN;

  if (!token) {
    // Fallback: return a safe default when no API key is configured
    return {
      should_respond: false,
      platform,
      group_id: groupId,
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: process.env.AIML_MODEL || "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AIML API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim() || "{}";

    // Parse JSON from response (may be wrapped in markdown code block)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return {
      should_respond: !!parsed.should_respond,
      platform,
      group_id: groupId,
      response: parsed.response,
      ...parsed,
    };
  } catch (err) {
    console.error("AIML API error:", err);
    return {
      should_respond: false,
      platform,
      group_id: groupId,
    };
  }
}
