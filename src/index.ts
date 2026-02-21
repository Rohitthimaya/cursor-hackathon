import "dotenv/config";
import express from "express";
import { normalizeMessage } from "./normalizer";
import { acquireGroupLock, releaseGroupLock } from "./lock";
import { loadContext } from "./context-loader";
import { retrieveFromVectorDB } from "./rag";
import { buildPrompt } from "./prompt";
import { callAIMLAPI } from "./aiml-client";
import { decisionEngine } from "./decision-engine";
import { updateMemory } from "./memory-updater";
import { sendTelegramMessage } from "./telegram";
import { startDiscordBot } from "./discord";
import type { IncomingMessage } from "./types";

const app = express();
app.use(express.json());

// Telegram Update type (incoming from Telegram webhook)
interface TelegramUpdate {
  message?: { text?: string; caption?: string; message_id: number; date: string; chat: { id: number }; from?: { id: number; first_name?: string; username?: string } };
  edited_message?: { text?: string; caption?: string; message_id: number; date: string; chat: { id: number }; from?: { id: number; first_name?: string; username?: string } };
  channel_post?: { text?: string; caption?: string; message_id: number; date: string; chat: { id: number }; sender_chat?: { title?: string } };
}

/**
 * Telegram webhook: receives updates when users message BhidduBot.
 * Processes through Jethalal and sends AI response back to Telegram.
 */
app.post("/api/telegram-webhook", async (req, res) => {
  const update = req.body as TelegramUpdate;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).send("TELEGRAM_BOT_TOKEN not configured");
  }

  const msg = update.message || update.edited_message || update.channel_post;
  if (!msg) {
    return res.status(200).send("ok");
  }

  const content = (msg.text || msg.caption || "").trim();
  if (!content) {
    return res.status(200).send("ok");
  }

  const chatId = String(msg.chat.id);
  const msgAny = msg as { from?: { id: number; first_name?: string; username?: string }; sender_chat?: { title?: string } };
  const userId = msgAny.from ? String(msgAny.from.id) : String(msg.chat.id);
  const userName = msgAny.from ? (msgAny.from.username || msgAny.from.first_name || "User") : (msgAny.sender_chat?.title || "Channel");

  const normalized = normalizeMessage({
    platform: "telegram",
    group_id: chatId,
    user_id: userId,
    user_name: userName,
    content,
    timestamp: typeof msg.date === "number" ? new Date(msg.date * 1000).toISOString() : String(msg.date || new Date().toISOString()),
    message_id: String(msg.message_id),
  });

  // Return 200 immediately so Telegram doesn't retry
  res.status(200).send("ok");

  // Process in background and send AI response to Telegram
  (async () => {
    let releaseLock: (() => void) | undefined;
    try {
      releaseLock = await acquireGroupLock(normalized.group_id);
      const context = await loadContext(normalized.group_id);
      const retrieved = await retrieveFromVectorDB(normalized.group_id, normalized.content_trimmed);
      const { system, user } = buildPrompt(normalized, context, retrieved);
      const aiResponse = await callAIMLAPI(system, user, "telegram", normalized.group_id);
      const finalResponse = decisionEngine(aiResponse, context);

      await updateMemory(normalized, finalResponse);

      if (finalResponse.should_respond && finalResponse.response?.content) {
        await sendTelegramMessage(token, chatId, finalResponse.response.content);
        console.log(`[Telegram] Sent AI reply to chat ${chatId}`);
      }
    } catch (err) {
      console.error("[Telegram webhook] Error:", err);
    } finally {
      if (releaseLock) releaseLock();
      releaseGroupLock(normalized.group_id);
    }
  })();
});

app.post("/api/message", async (req, res) => {
  const message = req.body as IncomingMessage;

  // Validate required fields
  if (!message?.group_id) {
    return res.status(400).json({
      error: "Missing required field: group_id",
    });
  }
  const raw = message as unknown as Record<string, unknown>;
  const content = message?.content ?? raw?.message ?? raw?.text;
  if (content === undefined || content === null || String(content).trim() === "") {
    return res.status(400).json({
      error: "Missing or empty required field: content (or message/text)",
    });
  }

  // 1. Normalize input (handles platform-specific field names)
  const normalized = normalizeMessage(message as IncomingMessage & Record<string, unknown>);

  // 2. Acquire per-group lock
  let releaseLock: (() => void) | undefined;
  try {
    releaseLock = await acquireGroupLock(normalized.group_id);
  } catch (err) {
    console.error("Lock acquire failed:", err);
    return res.status(503).json({ error: "AI busy, try again later" });
  }

  try {
    console.log(`[Jethalal] Incoming: ${normalized.platform}/${normalized.group_id} from ${normalized.user_name}: "${normalized.content_trimmed.slice(0, 60)}..."`);

    // 3. Load context from MongoDB
    const context = await loadContext(normalized.group_id);
    if (context.recent_messages.length > 0) {
      console.log(`[Jethalal] Loaded ${context.recent_messages.length} recent messages from MongoDB`);
    }

    // 4. Retrieve relevant past messages (RAG)
    const retrieved = await retrieveFromVectorDB(
      normalized.group_id,
      normalized.content_trimmed
    );
    if (retrieved.messages.length > 0) {
      console.log(`[Jethalal] RAG: found ${retrieved.messages.length} relevant past messages`);
    }

    // 5. Construct system + user prompt
    const { system, user } = buildPrompt(normalized, context, retrieved);

    // 6. Call AIML API to get response
    const aiResponse = await callAIMLAPI(
      system,
      user,
      normalized.platform,
      normalized.group_id
    );

    // 7. Decision engine: should AI respond?
    const finalResponse = decisionEngine(aiResponse, context);

    if (finalResponse.should_respond && finalResponse.response?.content) {
      console.log(`[Jethalal] Replying: "${finalResponse.response.content.slice(0, 60)}..."`);
    } else {
      console.log(`[Jethalal] No reply (should_respond=false)`);
    }

    // 8. Update memory (Mongo + Vector DB)
    await updateMemory(normalized, finalResponse);

    // 9. Return JSON response for bot
    res.json(finalResponse);
  } catch (err) {
    console.error("AI processing failed:", err);
    res.status(500).json({
      should_respond: false,
      platform: normalized.platform,
      group_id: normalized.group_id,
      error: "AI processing failed",
    });
  } finally {
    if (releaseLock) releaseLock();
    releaseGroupLock(normalized.group_id);
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "jethalal-ai" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Jethalal AI Brain listening on port ${PORT}`);
  console.log(`POST /api/message - Bot endpoint`);
  console.log(`POST /api/telegram-webhook - Telegram webhook (receives updates, sends AI replies)`);
  console.log(`GET  /health - Health check`);
  startDiscordBot();
});
