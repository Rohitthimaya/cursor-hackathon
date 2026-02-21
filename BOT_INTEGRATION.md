# Jethalal Bot Integration Guide

Share this with friends building Slack, WhatsApp, or Telegram bots.

## Base URL

```
https://your-jethalal-server.com/api
```

**Local dev:** `http://localhost:3001/api` (or whatever PORT you set)

---

## Endpoint

**POST** `/message`

Headers:
- `Content-Type: application/json`

### Request Body

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

| Field       | Type   | Required | Description                    |
|-------------|--------|----------|--------------------------------|
| platform    | string | Yes      | `"slack"` \| `"telegram"` \| `"whatsapp"` |
| group_id    | string | Yes      | Channel / chat ID              |
| user_id     | string | Yes      | Sender's platform ID           |
| user_name   | string | Yes      | Display name                   |
| content     | string | Yes      | Message text                   |
| timestamp   | string | Yes      | ISO8601, e.g. `2026-02-21T10:00:00Z` |
| message_id  | string | Yes      | Platform's message ID          |

### Response

```json
{
  "should_respond": true,
  "platform": "slack",
  "group_id": "C123",
  "response": {
    "type": "text",
    "content": "Looks like Saturday is winning! Should we create a poll? 😎",
    "options": ["Option1", "Option2"],
    "mention_user": "user_id"
  }
}
```

- **`should_respond`** – `true` = send a message; `false` = do nothing
- **`response.type`** – `"text"` \| `"poll"` \| `"reaction"` \| `"dm"`
- **`response.content`** – Text to send (for `type: "text"`)
- **`response.options`** – Poll options (for `type: "poll"`)
- **`response.mention_user`** – User to @mention (optional)

If `should_respond` is `false`, `response` is omitted.

---

## Example Flow

1. User sends a message in Slack/Telegram/WhatsApp.
2. Your bot receives it, normalizes it to the request schema.
3. Bot POSTs to `https://your-server.com/api/message`.
4. If `should_respond === true`, bot sends `response.content` to the group.
5. Bot uses `response.type`, `response.options`, `response.mention_user` per platform.

---

## cURL Example

```bash
curl -X POST https://your-server.com/api/message \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "slack",
    "group_id": "C123",
    "user_id": "U1",
    "user_name": "John",
    "content": "Where are we going?",
    "timestamp": "2026-02-21T10:00:00Z",
    "message_id": "msg_001"
  }'
```

---

## Hosting

- **Local:** Only accessible on your machine; bots must run on the same network or use ngrok.
- **Deploy:** Use Railway, Render, Fly.io, or a VPS so friends can reach `https://your-domain.com/api/message`.
