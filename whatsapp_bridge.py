"""
WhatsApp Bridge - Cursor UBC Hackathon
Receives Twilio WhatsApp webhooks, forwards to AI at localhost:5000/process, replies.
Same schema as Discord bridge for unified AI handshake.
"""

import os
from datetime import datetime

import aiohttp
from aiohttp import web
from dotenv import load_dotenv

load_dotenv()

AI_ENDPOINT = os.getenv(
    "AI_ENDPOINT",
    f"http://localhost:{os.getenv('AI_PORT', '5001')}/process",
)
LOG_FILE = os.path.join(os.path.dirname(__file__), "whatsapp_bridge.log")


def log(msg: str):
    """Print to console and append to log file."""
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().isoformat()}] {msg}\n")


def build_payload(from_num: str, body: str) -> dict:
    """Map WhatsApp message to same schema as Discord."""
    return {
        "platform": "whatsapp",
        "group_id": from_num,
        "user": from_num,
        "message": body,
        "timestamp": str(datetime.now()),
    }


async def call_ai(payload: dict) -> str:
    """POST payload to AI, return response text."""
    async with aiohttp.ClientSession() as session:
        async with session.post(AI_ENDPOINT, json=payload) as resp:
            if resp.status == 200:
                ct = resp.headers.get("Content-Type", "")
                if "application/json" in ct:
                    data = await resp.json()
                    return data.get("response", data.get("message", str(data)))
                return await resp.text()
            return f"AI error ({resp.status}): {await resp.text()}"


def twiml_message(text: str) -> str:
    """Build TwiML response to reply to sender."""
    escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{escaped}</Message></Response>'


async def webhook(request: web.Request) -> web.Response:
    """Handle Twilio WhatsApp webhook POST."""
    if request.method not in ("POST", "GET"):
        return web.Response(status=405)

    try:
        data = await request.post() if request.method == "POST" else request.query
        body = (data.get("Body") or "").strip()
        from_num = data.get("From", "")

        if not body:
            return web.Response(text='<?xml version="1.0" encoding="UTF-8"?><Response></Response>', content_type="text/xml")

        # Verification: log raw content and sender
        log(f"[VERIFY] Sender: {from_num} | Content: {body}")

        payload = build_payload(from_num=from_num, body=body)

        # AI handshake
        reply = await call_ai(payload)

        return web.Response(text=twiml_message(reply), content_type="text/xml")
    except Exception as e:
        log(f"[ERROR] {e}")
        return web.Response(text=twiml_message("Sorry, something went wrong."), content_type="text/xml")


def main():
    app = web.Application()
    app.router.add_post("/whatsapp", webhook)
    app.router.add_get("/whatsapp", webhook)  # Twilio can use GET for status

    port = int(os.getenv("WHATSAPP_BRIDGE_PORT", "3000"))
    log(f"WhatsApp bridge at http://0.0.0.0:{port}/whatsapp")
    log("Configure this URL in Twilio Console (with ngrok for local dev)")
    web.run_app(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
