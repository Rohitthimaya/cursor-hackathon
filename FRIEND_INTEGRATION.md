# BhidduBot → Jethalal: Send & Receive

**Flow:** User messages in Telegram → Bot sends to Jethalal → AI replies → Bot sends AI message back to Telegram.

## What your friend needs

### 1. Use `Telegram.py` from this repo

This script already:
- Receives messages from Telegram
- POSTs them to Jethalal
- **Sends the AI reply back to Telegram** via `reply_text()`

### 2. Set these env vars

```
TELEGRAM_BOT_TOKEN=8363596711:AAE9ypTeGLftBws2s2cn9trfb6cLjMawtbk
JETHALAL_API_URL=https://cursor-hackathon-f84m.onrender.com/api/message
```

### 3. Run

```bash
pip install python-telegram-bot python-dotenv
python Telegram.py
```

---

## How the AI message gets to Telegram

When Jethalal returns `{ "should_respond": true, "response": { "content": "..." } }`, the bot uses the Telegram Bot API to send it:

```
Bot calls: update.message.reply_text(ai_response_content)
         → Telegram API: POST https://api.telegram.org/bot{TOKEN}/sendMessage
         → User sees the AI reply in the chat
```

The bot token lets it send messages; `reply_text()` does that.

---

## If your friend has their own bot code

Add this block where they handle incoming messages:

```python
import json
from urllib.request import Request, urlopen

async def send_to_jethalal_and_reply(update, context):
    """Call this when a message arrives. Sends to Jethalal and replies with AI."""
    msg = update.message
    if not msg or not msg.text:
        return

    payload = {
        "platform": "telegram",
        "group_id": str(update.effective_chat.id),
        "user_id": str(update.effective_user.id),
        "user_name": update.effective_user.first_name or "User",
        "content": msg.text,
        "timestamp": msg.date.isoformat(),
        "message_id": str(msg.message_id),
    }

    try:
        req = Request(
            "https://cursor-hackathon-f84m.onrender.com/api/message",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
            if data.get("should_respond") and data.get("response", {}).get("content"):
                # ← THIS SENDS THE AI MESSAGE TO TELEGRAM
                await msg.reply_text(data["response"]["content"])
    except Exception as e:
        print("Jethalal error:", e)
```

**Important:** `msg.reply_text(...)` is what actually sends the AI message to Telegram. Without it, the AI reply never appears in the chat.
