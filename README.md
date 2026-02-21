# cursor-hackathon

Multi-platform AI bridge: Discord and WhatsApp messages → localhost AI → reply.

## Schema (unified)

Both bridges POST to `http://localhost:{AI_PORT}/process` with:

```json
{
  "platform": "discord" | "whatsapp",
  "group_id": "channel-or-sender-id",
  "user": "sender-identifier",
  "message": "message content",
  "timestamp": "ISO timestamp"
}
```

## Discord Bridge

1. Add `DISCORD_TOKEN` to `.env`
2. (Optional) Add `BOT_CALLBACK_URL` so AI can push messages back
3. Run: `python discord_bot.py`
4. Logs: `discord_bot.log`

**AI → Discord:** The bot exposes `POST /discord/send` for the AI server to push messages. Body: `{"channel_id": "123", "content": "Hello"}` or `{"group_id": "123", "content": "..."}`. When `BOT_CALLBACK_URL` is set, the bot includes `callback_url` in every payload to the AI.

## WhatsApp Bridge (Twilio)

1. Create [Twilio](https://twilio.com) account, enable [WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Add to `.env`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (optional for webhook reply)
3. Expose locally: `ngrok http 3000`
4. In Twilio Console → WhatsApp Sandbox → set webhook to `https://YOUR-NGROK.ngrok.io/whatsapp`
5. Run: `python whatsapp_bridge.py`
6. Logs: `whatsapp_bridge.log`

## Terminal Testing

```bash
# Mock AI server (port 5001)
python mock_ai_server.py

# Test Discord flow
python test_bridge.py "hello"

# Test WhatsApp flow (bridge must be running)
python whatsapp_bridge.py &  # Terminal 2
python test_whatsapp_bridge.py "hello"
```
