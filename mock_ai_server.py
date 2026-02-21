"""
Mock AI server for terminal testing.
Accepts POST /process, returns a canned response.
Run: python mock_ai_server.py
"""

from aiohttp import web


async def process(request: web.Request) -> web.Response:
    if request.method != "POST":
        return web.json_response({"error": "POST only"}, status=405)
    try:
        data = await request.json()
        user = data.get("user", "?")
        msg = data.get("message", "?")
        return web.json_response({
            "response": f"Mock AI reply to {user}: I received '{msg}'",
            "received": data,
        })
    except Exception as e:
        return web.json_response({"error": str(e)}, status=400)


def main():
    import os
    port = int(os.getenv("PORT", "5001"))
    app = web.Application()
    app.router.add_post("/process", process)
    print(f"Mock AI server at http://localhost:{port}/process")
    print("Press Ctrl+C to stop")
    web.run_app(app, host="127.0.0.1", port=port)


if __name__ == "__main__":
    main()
