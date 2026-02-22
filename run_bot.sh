#!/bin/bash
# Run Discord bot and show logs in terminal
cd "$(dirname "$0")"
source .venv/bin/activate 2>/dev/null || .venv/bin/activate
echo "Starting bot - logs will appear below. Send a message in Discord to test."
echo "---"
python discord_bot.py
