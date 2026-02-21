"""
Telegram bot that forwards messages to Jethalal AI and sends responses back.
Handles: text, caption (photos/videos), edited messages, channel posts.
Set TELEGRAM_BOT_TOKEN and JETHALAL_API_URL in .env or environment.
"""

import json
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, ContextTypes, filters

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
JETHALAL_API_URL = os.getenv("JETHALAL_API_URL", "https://cursor-hackathon-f84m.onrender.com/api/message")


def _extract_content(msg) -> str | None:
    """Get processable text from message: text, caption, or placeholder for media."""
    if not msg:
        return None
    text = (msg.text or msg.caption or "").strip()
    if text:
        return text
    # Media without caption: describe for AI context (optional - or skip)
    if msg.photo:
        return "[User sent a photo]"
    if msg.video:
        return "[User sent a video]"
    if msg.document:
        return "[User sent a document]"
    if msg.voice:
        return "[User sent a voice message]"
    if msg.sticker:
        return "[User sent a sticker]"
    if msg.animation:
        return "[User sent a GIF]"
    return None


def _build_payload(update: Update) -> dict | None:
    """
    Build Jethalal API payload from Telegram update.
    Returns None if no processable content.
    """
    msg = update.effective_message
    if not msg:
        return None

    content = _extract_content(msg)
    if not content:
        return None

    user = update.effective_user
    chat = update.effective_chat

    # For channel posts, effective_user can be None
    user_id = str(user.id) if user else str(chat.id)
    user_name = (
        (user.username or user.first_name or user.last_name or "User")
        if user
        else (getattr(chat, "title", None) or "Channel")
    )
    user_name = user_name or "Unknown"

    # Timestamp: ensure ISO8601 (Telegram dates may lack timezone)
    ts = msg.date
    if ts:
        timestamp = ts.isoformat()
        if ts.tzinfo is None:
            timestamp += "Z"  # Assume UTC if naive
    else:
        from datetime import datetime, timezone
        timestamp = datetime.now(timezone.utc).isoformat()

    return {
        "platform": "telegram",
        "group_id": str(chat.id),
        "user_id": user_id,
        "user_name": user_name,
        "content": content,
        "timestamp": timestamp,
        "message_id": str(msg.message_id),
    }


def call_jethalal(payload: dict) -> dict | None:
    """POST message to Jethalal AI and return response JSON."""
    try:
        body = json.dumps(payload).encode("utf-8")
        req = Request(
            JETHALAL_API_URL,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except HTTPError as e:
        print(f"Jethalal API HTTP error: {e.code} {e.reason}")
        if e.readable():
            try:
                print(e.read().decode())
            except Exception:
                pass
        return None
    except URLError as e:
        print(f"Jethalal API connection error: {e.reason}")
        return None
    except json.JSONDecodeError as e:
        print(f"Jethalal API invalid JSON: {e}")
        return None


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    payload = _build_payload(update)
    if not payload:
        return

    print("\n===== TELEGRAM → JETHALAL =====")
    print(json.dumps(payload, indent=2))
    print("==============================\n")

    response = call_jethalal(payload)
    if not response:
        return

    # Validate response structure before replying
    if not response.get("should_respond"):
        return
    resp_obj = response.get("response")
    if not resp_obj or not isinstance(resp_obj, dict):
        return
    content = resp_obj.get("content")
    if not content or not str(content).strip():
        return

    msg = update.effective_message
    try:
        await msg.reply_text(str(content).strip())
        print(f"Jethalal replied: {content[:80]}...")
    except Exception as e:
        print(f"Failed to send reply to Telegram: {e}")


def main():
    if not BOT_TOKEN:
        print("Error: Set TELEGRAM_BOT_TOKEN in .env or environment")
        return
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    # Handle regular messages (text, photo with caption, etc.)
    app.add_handler(MessageHandler(filters.ALL, handle_message))

    # Handle edited messages
    app.add_handler(MessageHandler(filters.UpdateType.EDITED_MESSAGE, handle_message))

    # Handle channel posts and edited channel posts (ptb v20+)
    for attr in ("CHANNEL_POST", "EDITED_CHANNEL_POST", "CHANNEL_POSTS"):
        try:
            app.add_handler(MessageHandler(getattr(filters.UpdateType, attr), handle_message))
        except AttributeError:
            pass

    print("Jethalal Telegram bot running...")
    print(f"Jethalal API: {JETHALAL_API_URL}")
    app.run_polling()


if __name__ == "__main__":
    main()
