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
  if (!message?.group_id || !message?.content) {
    return res.status(400).json({
      error: "Missing required fields: group_id, content",
    });
  }

  // 1. Normalize input
  const normalized = normalizeMessage(message);

  // 2. Acquire per-group lock
  let releaseLock: (() => void) | undefined;
  try {
    releaseLock = await acquireGroupLock(normalized.group_id);
  } catch (err) {
    console.error("Lock acquire failed:", err);
    return res.status(503).json({ error: "AI busy, try again later" });
  }

  try {
    // 3. Load context from MongoDB + Vector DB
    const context = await loadContext(normalized.group_id);

    // 4. Retrieve relevant past messages (RAG)
    const retrieved = await retrieveFromVectorDB(
      normalized.group_id,
      normalized.content_trimmed
    );

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
