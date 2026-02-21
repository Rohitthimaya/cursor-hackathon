# Jethalal — Socially Intelligent AI Assistant for Group Chats

AI Brain for a context-aware, socially intelligent assistant that participates in group chats across Slack, WhatsApp, and Telegram.

## Architecture

```
User Message
    │
    ▼
Jethalal Bot (Slack/Telegram/WhatsApp)
    │ Normalized POST
    ▼
AI Brain (this service)
    ├─ Input Normalizer
    ├─ Per-Group Lock
    ├─ Context Loader (MongoDB + Vector DB)
    ├─ RAG Retrieval
    ├─ Prompt Construction
    ├─ Generative AI (AIML/OpenAI API)
    ├─ Decision Engine
    └─ Memory Updater
    │
    ▼
Bot receives JSON → Sends to platform
```

## Quick Start

```bash
npm install
cp .env.example .env   # Add your API keys
npm run dev
```

## API

### POST /api/message

Bots POST incoming messages here. Request body:

```json
{
  "platform": "slack",
  "group_id": "C123",
  "user_id": "U456",
  "user_name": "John",
  "content": "Where are we going?",
  "timestamp": "2026-02-21T10:00:00Z",
  "message_id": "msg_001"
}
```

Response:

```json
{
  "should_respond": true,
  "platform": "slack",
  "group_id": "C123",
  "response": {
    "type": "text",
    "content": "Looks like Saturday is winning! Should we create a poll? 😎"
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGO_URL` | MongoDB connection string (optional) |
| `VECTOR_DB_URL` | Zilliz Cloud / Milvus base URL (optional) |
| `VECTOR_DB_API_KEY` | Zilliz API key for Bearer auth |
| `VECTOR_DB_EMBEDDING_DIM` | Embedding dimension, e.g. 1536 (OpenAI) |
| `AIML_API_TOKEN` | AIML API key |
| `AIML_API_BASE_URL` | Base URL, e.g. `https://api.aimlapi.com/v1` (appends `/chat/completions`) |
| `PORT` | Server port (default: 3000) |

### Milvus / Zilliz setup

Create the `jethalal_messages` collection and schema before using RAG:

```bash
# Add VECTOR_DB_URL and VECTOR_DB_API_KEY to .env, then:
npm run setup:milvus
```

List collections (optional):
```bash
curl -X POST "${VECTOR_DB_URL}/v2/vectordb/collections/list" \
  -H "Authorization: Bearer ${VECTOR_DB_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Project Structure

```
src/
├── index.ts           # Express server, /api/message endpoint
├── types.ts           # IncomingMessage, AIResponse, etc.
├── normalizer.ts      # Input normalization
├── lock.ts            # Per-group concurrency lock
├── context-loader.ts  # Load from MongoDB
├── rag.ts             # Vector DB retrieval
├── prompt.ts          # System + user prompt construction
├── aiml-client.ts     # LLM API client
├── decision-engine.ts # should_respond logic
├── memory-updater.ts  # Persist to Mongo + Vector DB
└── db/
    └── mongo.ts       # MongoDB client
```

## MongoDB & Vector DB (live)

When `MONGO_URL` is set:
- **MongoDB**: Stores every user message and AI response in `messages` collection
- **context-loader**: Loads recent messages for prompt context

When `VECTOR_DB_URL` and `VECTOR_DB_API_KEY` are set:
- **Embeddings**: Uses `AIML_API_TOKEN` + `/embeddings` (text-embedding-ada-002)
- **Milvus**: Inserts embeddings for each message; RAG searches for relevant past messages

Add `MONGO_URL`, `VECTOR_DB_URL`, `VECTOR_DB_API_KEY` to Render env vars to persist data.
- **AIML API**: Configure `AIML_API_TOKEN` and `AIML_API_URL` for any OpenAI-compatible LLM
