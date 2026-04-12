#!/bin/bash
cd /home/z/my-project
# Double-fork to detach from terminal
(
  while true; do
    npx next dev -p 3000 2>/dev/null
    sleep 2
  done
) &
disown
echo "Server daemon started"
