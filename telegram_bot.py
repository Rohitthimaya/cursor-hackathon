"""
Telegram Bridge - Same schema as Discord, forwards to AI at /api/message.
"""

import json
import os

import requests
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_URL = os.getenv("AI_ENDPOINT", "https://cursor-hackathon-f84m.onrender.com/api/message")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return

    message_data = {
        "group_id": str(update.effective_chat.id),
        "content": update.message.text,
        "user": update.effective_user.username or update.effective_user.first_name or str(update.effective_user.id),
        "platform": "telegram",
        "timestamp": update.message.date.isoformat(),
    }

    print("\n===== SENDING TO SERVER =====")
    print(json.dumps(message_data, indent=4))

    try:
        response = requests.post(API_URL, json=message_data, timeout=15)
        print("Status Code:", response.status_code)
        print("Response:", response.text[:200])

        if response.status_code == 200:
            data = response.json()
            if data.get("should_respond"):
                raw = data.get("response", data.get("message"))
                ai_text = (raw.get("content") if isinstance(raw, dict) else None) or (str(raw) if raw else None)
                if ai_text:
                    await update.message.reply_text(ai_text)
                    print("Replied to user")
    except Exception as e:
        print("ERROR:", e)
        await update.message.reply_text(f"Error: {e}")


def main():
    if not BOT_TOKEN:
        print("TELEGRAM_BOT_TOKEN not set. Add to .env")
        return

    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("Telegram bridge running...")
    app.run_polling()


if __name__ == "__main__":
    main()
