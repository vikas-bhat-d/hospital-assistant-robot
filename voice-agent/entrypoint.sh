#!/bin/sh
set -e

# Start token generator Flask app in background
python token_gen.py &

# Start LiveKit agent (foreground)
python agent.py dev
