#!/bin/bash
# Daemonize the Next.js dev server
cd /home/z/my-project

# Kill any existing instances
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 1

# Start in background with nohup, redirect all output
nohup node node_modules/.bin/next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &

# Disown the process so it survives shell exit
disown

# Wait and verify
sleep 5
if ss -tlnp | grep -q ":3000"; then
  echo "Server started successfully on port 3000"
  ss -tlnp | grep 3000
else
  echo "WARNING: Server may not have started properly"
fi
