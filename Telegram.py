#BOT_TOKEN = "8363596711:AAE9ypTeGLftBws2s2cn9trfb6cLjMawtbk"


import json
# import requests   # <-- keep this for later when API is ready

from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, ContextTypes, filters

BOT_TOKEN = "8363596711:AAE9ypTeGLftBws2s2cn9trfb6cLjMawtbk"

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message:
        return

    message_data = {
        "id": update.message.message_id,
        "platform": "telegram",
        "group_id": str(update.effective_chat.id),
        "user": update.effective_user.username or update.effective_user.first_name,
        "message": update.message.text,
        "timestamp": update.message.date.isoformat()
    }

    print("\n===== MESSAGE RECEIVED =====")
    print(json.dumps(message_data, indent=4))
    print("============================\n")

    # -------------------------------
    # 🔵 FUTURE: SEND TO AI SERVER
    # -------------------------------
    """
    response = requests.post(
        "http://your-ai-server-url",
        json=message_data
    )

    if response.status_code == 200:
        ai_reply = response.json().get("reply")
        if ai_reply:
            await update.message.reply_text(ai_reply)
    """
    # -------------------------------

def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    # VERY IMPORTANT: receive EVERYTHING
    app.add_handler(MessageHandler(filters.ALL, handle_message))

    print("Bridge bot running...")
    app.run_polling()

if __name__ == "__main__":
    main()