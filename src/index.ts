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
import type { IncomingMessage } from "./types";

const app = express();
app.use(express.json());

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
  console.log(`GET  /health - Health check`);
});
