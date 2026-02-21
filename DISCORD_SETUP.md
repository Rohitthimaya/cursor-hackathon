# Discord Bhiddu Bot Setup

## 1. Discord Developer Portal

1. Go to https://discord.com/developers/applications
2. Select your app (Bhiddu) or create one
3. Go to **Bot** → **Reset Token** if needed → copy the token
4. Enable **Message Content Intent** under Privileged Gateway Intents (required to read messages)
5. Invite the bot to your server: **OAuth2** → **URL Generator** → scopes: `bot`, permissions: `Send Messages`, `Read Message History`, `View Channels` → copy URL and open in browser

## 2. Add env var on Render

```
DISCORD_BOT_TOKEN=your_discord_bot_token_here
```

**Never commit your real token to Git.** Use environment variables only.

## 3. Redeploy

Render will redeploy. The Discord bot connects when the server starts.

## 4. Test

1. Add Bhiddu bot to your Discord server (if not already)
2. Send a message in any channel where the bot has access
3. The bot should reply with the AI response when it decides to respond

---

**Note:** Discord uses a Gateway (WebSocket) connection. The bot runs in the same process as the Express server.
