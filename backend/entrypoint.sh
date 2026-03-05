#!/bin/sh
# Cloud Run injects PORT at runtime; bind to it so the platform can reach the app.
port="${PORT:-8080}"
echo "Starting uvicorn on 0.0.0.0:${port}" 1>&2
exec uvicorn server:app --host 0.0.0.0 --port "$port"
