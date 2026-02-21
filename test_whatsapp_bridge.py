"""
Terminal test for WhatsApp bridge: simulates Twilio webhook.
Run: python test_whatsapp_bridge.py [message]
Requires: mock AI server (python mock_ai_server.py) and WhatsApp bridge (python whatsapp_bridge.py)
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

import aiohttp

# Bridge runs on 3000 by default
BRIDGE_URL = f"http://localhost:{os.getenv('WHATSAPP_BRIDGE_PORT', '3000')}/whatsapp"


async def send_webhook(body: str, from_num: str = "whatsapp:+14155551234") -> str:
    """Simulate Twilio POST to webhook."""
    data = {"Body": body, "From": from_num, "To": "whatsapp:+14155238886"}
    async with aiohttp.ClientSession() as session:
        async with session.post(BRIDGE_URL, data=data) as resp:
            return await resp.text()


def main():
    message = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Hello from WhatsApp test"
    print("=" * 50)
    print("[VERIFY] Simulated WhatsApp message")
    print(f"  From: whatsapp:+14155551234")
    print(f"  Content: {message}")
    print()
    print("[WEBHOOK] POST to", BRIDGE_URL)
    print("-" * 50)

    try:
        twiml = asyncio.run(send_webhook(message))
        print("[RESPONSE] TwiML:", twiml[:200] + "..." if len(twiml) > 200 else twiml)
    except aiohttp.ClientError as e:
        print("[ERROR] Could not reach bridge:", e)
        print()
        print("Tip: Start both servers first:")
        print("  Terminal 1: python mock_ai_server.py")
        print("  Terminal 2: python whatsapp_bridge.py")
    except Exception as e:
        print("[ERROR]", e)

    print("=" * 50)


if __name__ == "__main__":
    main()
