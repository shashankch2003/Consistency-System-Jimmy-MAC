#!/bin/bash
while true; do
  echo "Starting server..."
  NODE_ENV=development npx tsx server/index.ts
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE — restarting in 2 seconds..."
  sleep 2
done
