"""
Discord Bridge Bot - Cursor UBC Hackathon
Listens for messages, forwards to AI, replies. Also exposes /discord/send for AI to push messages.
"""

import asyncio
import os
from datetime import datetime

import aiohttp
import discord
from aiohttp import web
from dotenv import load_dotenv

load_dotenv()

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
AI_ENDPOINT = os.getenv(
    "AI_ENDPOINT",
    "https://cursor-hackathon-f84m.onrender.com/api/message",
)
# Render sets RENDER_EXTERNAL_URL automatically; otherwise use BOT_CALLBACK_URL
BOT_CALLBACK_URL = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BOT_CALLBACK_URL")
LOG_FILE = os.path.join(os.path.dirname(__file__), "discord_bot.log")
# PORT from Render/Railway; BOT_SEND_PORT for local
SEND_PORT = int(os.getenv("PORT", os.getenv("BOT_SEND_PORT", "3002")))


def log(msg: str):
    """Print to console and append to log file (view in Cursor)."""
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().isoformat()}] {msg}\n")

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)


def build_payload(message: discord.Message) -> dict:
    """Map Discord message to API schema. Include callback_url so AI can push replies."""
    payload = {
        "platform": "discord",
        "group_id": str(message.channel.id),
        "user": str(message.author),
        "content": message.content,
        "timestamp": str(message.created_at),
    }
    if BOT_CALLBACK_URL:
        payload["callback_url"] = f"{BOT_CALLBACK_URL.rstrip('/')}/discord/send"
    return payload


async def handle_send(request: web.Request) -> web.Response:
    """AI server POSTs here to send a message to a Discord channel."""
    try:
        data = await request.json()
        channel_id = data.get("channel_id") or data.get("group_id")
        content = data.get("content") or data.get("message")
        if not channel_id or not content:
            return web.json_response(
                {"error": "channel_id (or group_id) and content required"}, status=400
            )
        channel = client.get_channel(int(channel_id))
        if not channel:
            return web.json_response({"error": "channel not found"}, status=404)
        await channel.send(str(content))
        log(f"[AI→Discord] Sent to {channel_id}: {content[:50]}...")
        return web.json_response({"ok": True})
    except Exception as e:
        log(f"[ERROR] handle_send: {e}")
        return web.json_response({"error": str(e)}, status=500)


async def start_send_server():
    """Run HTTP server for AI to push messages + health check."""
    app = web.Application()
    app.router.add_post("/discord/send", handle_send)
    async def health(_):
        return web.json_response({"status": "ok", "bot": "discord"})
    app.router.add_get("/", health)
    app.router.add_get("/health", health)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", SEND_PORT)
    await site.start()
    log(f"Send endpoint: http://0.0.0.0:{SEND_PORT}/discord/send")


@client.event
async def on_ready():
    log(f"Logged in as {client.user} (ID: {client.user.id})")
    log("Listening for messages...")
    if BOT_CALLBACK_URL:
        log(f"AI can push messages to {BOT_CALLBACK_URL}/discord/send")


@client.event
async def on_message(message: discord.Message):
    if message.author == client.user:
        return

    # Verification: log raw content and sender (console + discord_bot.log)
    log(f"[VERIFY] Sender: {message.author} | Content: {message.content}")

    payload = build_payload(message)

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(AI_ENDPOINT, json=payload) as resp:
                if resp.status == 200:
                    content_type = resp.headers.get("Content-Type", "")
                    if "application/json" in content_type:
                        data = await resp.json()
                        if data.get("should_respond"):
                            raw = data.get("response", data.get("message"))
                            # AI returns {"type": "text", "content": "..."} or plain string
                            if isinstance(raw, dict):
                                reply = raw.get("content", str(raw))
                            else:
                                reply = str(raw) if raw else str(data)
                            await message.channel.send(reply)
                    else:
                        reply = await resp.text()
                        await message.channel.send(reply)
                else:
                    text = await resp.text()
                    await message.channel.send(f"AI error ({resp.status}): {text[:500]}")
        except aiohttp.ClientError as e:
            await message.channel.send(f"Could not reach AI: {e}")
        except Exception as e:
            await message.channel.send(f"Error: {e}")


async def main():
    # Start HTTP server first so Render health check succeeds immediately
    await start_send_server()
    # Then connect Discord (keeps running)
    await client.start(DISCORD_TOKEN)


def run():
    if not DISCORD_TOKEN:
        print("DISCORD_TOKEN not set. Add it to .env (see .env.example)")
        return
    asyncio.run(main())


if __name__ == "__main__":
    run()
