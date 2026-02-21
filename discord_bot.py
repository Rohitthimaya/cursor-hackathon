"""
Discord Bridge Bot - Cursor UBC Hackathon
Listens for messages, forwards to AI at localhost:5000/process, and replies.
"""

import asyncio
import os
from datetime import datetime

import aiohttp
import discord
from dotenv import load_dotenv

load_dotenv()

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
AI_PORT = os.getenv("AI_PORT", "5001")  # 5000 often used by macOS AirPlay
AI_ENDPOINT = f"http://localhost:{AI_PORT}/process"
LOG_FILE = os.path.join(os.path.dirname(__file__), "discord_bot.log")


def log(msg: str):
    """Print to console and append to log file (view in Cursor)."""
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().isoformat()}] {msg}\n")

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)


def build_payload(message: discord.Message) -> dict:
    """Map Discord message to schema for AI handshake."""
    return {
        "platform": "discord",
        "group_id": str(message.channel.id),
        "user": str(message.author),
        "message": message.content,
        "timestamp": str(message.created_at),
    }


@client.event
async def on_ready():
    log(f"Logged in as {client.user} (ID: {client.user.id})")
    log("Listening for messages...")


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
                        reply = data.get("response", data.get("message", str(data)))
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


def main():
    if not DISCORD_TOKEN:
        print("DISCORD_TOKEN not set. Add it to .env (see .env.example)")
        return
    client.run(DISCORD_TOKEN)


if __name__ == "__main__":
    main()
