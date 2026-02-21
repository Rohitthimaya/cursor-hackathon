#BOT_TOKEN = "8363596711:AAE9ypTeGLftBws2s2cn9trfb6cLjMawtbk"

import json
import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, ContextTypes, filters

BOT_TOKEN = "8363596711:AAE9ypTeGLftBws2s2cn9trfb6cLjMawtbk"
API_URL = "https://cursor-hackathon-f84m.onrender.com/api/message"

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message:
        return

    message_data = {
    "group_id": str(update.effective_chat.id),
    "content": update.message.text,
    "user": update.effective_user.username or update.effective_user.first_name,
    "platform": "telegram",
    "timestamp": update.message.date.isoformat()
}

    print("\n===== SENDING TO SERVER =====")
    print(json.dumps(message_data, indent=4))

    try:
        response = requests.post(API_URL, json=message_data, timeout=10)

        print("Status Code:", response.status_code)
        print("Response:", response.text)

        if response.status_code == 200:
            data = response.json()

            if data.get("should_respond"):
                ai_text = data.get("response", {}).get("content")

                if ai_text:
                    await update.message.reply_text(ai_text)

    except Exception as e:
        print("ERROR:", e)

def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.ALL, handle_message))

    print("Bridge bot running...")
    app.run_polling()

if __name__ == "__main__":
    main()
