"""
Terminal test for Discord bridge: schema mapping + AI handshake.
Run: python test_bridge.py [message]
Example: python test_bridge.py "Hello from terminal"

Uses TEST_PORT=5001 by default (mock server). Set TEST_PORT=5000 for real AI.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

import aiohttp

AI_ENDPOINT = f"http://localhost:{os.getenv('TEST_PORT', '5001')}/process"


def build_payload(user: str, message: str, group_id: str = "test-channel-123") -> dict:
    """Same schema as Discord bot."""
    return {
        "platform": "discord",
        "group_id": group_id,
        "user": user,
        "message": message,
        "timestamp": str(datetime.now(timezone.utc)),
    }


async def test_handshake(payload: dict) -> str:
    async with aiohttp.ClientSession() as session:
        async with session.post(AI_ENDPOINT, json=payload) as resp:
            if resp.status == 200:
                ct = resp.headers.get("Content-Type", "")
                if "application/json" in ct:
                    data = await resp.json()
                    return data.get("response", data.get("message", str(data)))
                return await resp.text()
            return f"Error {resp.status}: {await resp.text()}"


def main():
    message = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Test message from terminal"
    payload = build_payload(user="TerminalTester#0000", message=message)

    print("=" * 50)
    print("[VERIFY] Simulated message")
    print(f"  Sender: {payload['user']}")
    print(f"  Content: {payload['message']}")
    print()
    print("[SCHEMA] Payload being sent:")
    for k, v in payload.items():
        print(f"  {k}: {v}")
    print()
    print("[AI HANDSHAKE] POST to", AI_ENDPOINT)
    print("-" * 50)

    try:
        reply = asyncio.run(test_handshake(payload))
        print("[RESPONSE]", reply)
    except aiohttp.ClientError as e:
        print("[ERROR] Could not reach AI:", e)
        print()
        print("Tip: Start the mock server first:")
        print("  python mock_ai_server.py")
    except Exception as e:
        print("[ERROR]", e)

    print("=" * 50)


if __name__ == "__main__":
    main()
