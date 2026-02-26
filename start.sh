#!/bin/bash
fuser -k 5000/tcp 2>/dev/null
sleep 1
while true; do
  echo "Starting server..."
  NODE_ENV=development npx tsx server/index.ts
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE — restarting in 2 seconds..."
  fuser -k 5000/tcp 2>/dev/null
  sleep 2
done
