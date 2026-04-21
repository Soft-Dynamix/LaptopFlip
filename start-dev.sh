#!/bin/bash
while true; do
  echo "=== Starting dev server at $(date) ==="
  bun run dev 2>&1
  echo "=== Server exited, restarting in 2s ==="
  sleep 2
done
