# Deploy Discord Bot to Render

## 1. Push to GitHub

Ensure your code is pushed to your repo (e.g. `Rohitthimaya/cursor-hackathon`).

## 2. Deploy on Render

1. Go to [render.com](https://render.com) and sign in (use GitHub).
2. **New** → **Web Service**.
3. Connect your repo: `cursor-hackathon`.
4. Configure:
   - **Name:** `discord-bot` (or any name)
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python discord_bot.py`
5. **Environment:**
   - Add `DISCORD_TOKEN` (from your Discord Developer Portal).
   - `AI_ENDPOINT` and `BOT_CALLBACK_URL` are optional; Render sets `RENDER_EXTERNAL_URL` for the callback.
6. Click **Create Web Service**.

## 3. After Deploy

- Your bot URL: `https://discord-bot-xxxx.onrender.com`
- Health check: `https://discord-bot-xxxx.onrender.com/health`
- AI callback: `https://discord-bot-xxxx.onrender.com/discord/send`

The AI server should POST to `https://YOUR-SERVICE.onrender.com/discord/send` with:
```json
{"channel_id": "123", "content": "message"}
```

## Blueprint (Alternative)

If your repo has `render.yaml`, you can use **Blueprint** to deploy from the YAML.
