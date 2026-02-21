# Telegram Webhook Setup - BhidduBot

Since BhidduBot is an external service, we receive Telegram messages via **webhook** and send AI replies using the Telegram Bot API.

## Flow

1. User messages @BhidduBot in Telegram
2. Telegram sends the update to our webhook URL
3. Jethalal processes it, generates AI response
4. We send the AI reply to Telegram via `sendMessage`
5. User sees the reply in the chat

## Setup Steps

### 1. Add env var on Render

```
TELEGRAM_BOT_TOKEN=8363596711:AAE9ypTeGLftBws2s2cn9trfb6cLjMawtbk
```

### 2. Set the webhook (one-time)

Tell Telegram to send BhidduBot updates to our API:

```bash
curl "https://api.telegram.org/bot8363596711:AAE9ypTeGLftBws2s2cn9trfb6cLjMawtbk/setWebhook?url=https://cursor-hackathon-f84m.onrender.com/api/telegram-webhook"
```

Or open in browser:
```
https://api.telegram.org/bot8363596711:AAE9ypTeGLftBws2s2cn9trfb6cLjMawtbk/setWebhook?url=https://cursor-hackathon-f84m.onrender.com/api/telegram-webhook
```

You should see: `{"ok":true,"result":true,"description":"Webhook was set"}`

### 3. Test

1. Open https://t.me/BhidduBot
2. Send a message: "Hey, where should we eat?"
3. Wait a few seconds (Render cold start may add delay)
4. BhidduBot should reply with the AI response

### 4. Remove webhook (if needed)

```bash
curl "https://api.telegram.org/bot8363596711:AAE9ypTeGLftBws2s2cn9trfb6cLjMawtbk/deleteWebhook"
```

---

## Important

- **HTTPS required**: Telegram only sends to HTTPS URLs (Render provides this)
- **No polling**: When webhook is set, the bot cannot use `getUpdates` (polling)
- **Fast reply**: We return 200 immediately, then process in background and send the AI message
