/**
 * Discord bot - connects via Gateway, receives messages, sends AI replies
 */

import {
  Client,
  GatewayIntentBits,
  Message,
  PartialMessage,
} from "discord.js";
import { normalizeMessage } from "./normalizer";
import { acquireGroupLock, releaseGroupLock } from "./lock";
import { loadContext } from "./context-loader";
import { retrieveFromVectorDB } from "./rag";
import { buildPrompt } from "./prompt";
import { callAIMLAPI } from "./aiml-client";
import { decisionEngine } from "./decision-engine";
import { updateMemory } from "./memory-updater";

export function startDiscordBot(): void {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log("[Discord] DISCORD_BOT_TOKEN not set - skipping Discord bot");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on("messageCreate", async (message: Message | PartialMessage) => {
    if (message.author?.bot) return;
    const content = (message.content || "").trim();
    if (!content) return;

    const channelId = message.channel?.id;
    const userId = message.author?.id || "unknown";
    const userName = message.author?.username || message.author?.globalName || "User";

    const normalized = normalizeMessage({
      platform: "discord",
      group_id: channelId || "unknown",
      user_id: userId,
      user_name: userName,
      content,
      timestamp: message.createdAt?.toISOString() || new Date().toISOString(),
      message_id: message.id || `discord_${Date.now()}`,
    });

    (async () => {
      let releaseLock: (() => void) | undefined;
      try {
        releaseLock = await acquireGroupLock(normalized.group_id);
        const context = await loadContext(normalized.group_id);
        const retrieved = await retrieveFromVectorDB(normalized.group_id, normalized.content_trimmed);
        const { system, user } = buildPrompt(normalized, context, retrieved);
        const aiResponse = await callAIMLAPI(system, user, "discord", normalized.group_id);
        const finalResponse = decisionEngine(aiResponse, context);

        await updateMemory(normalized, finalResponse);

        if (finalResponse.should_respond && finalResponse.response?.content && message.channel) {
          await message.reply(finalResponse.response.content);
          console.log(`[Discord] Sent AI reply to channel ${channelId}`);
        }
      } catch (err) {
        console.error("[Discord] Error:", err);
      } finally {
        if (releaseLock) releaseLock();
        releaseGroupLock(normalized.group_id);
      }
    })();
  });

  client.login(token).then(() => {
    console.log("[Discord] Bhiddu bot connected");
  }).catch((err) => {
    console.error("[Discord] Login failed:", err);
  });
}
