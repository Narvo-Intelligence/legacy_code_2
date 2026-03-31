# Narvo backend — Google Cloud Run (build from repo root for Cloud Build)
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code and entrypoint
COPY backend/ .
RUN chmod +x entrypoint.sh

# Cloud Run injects PORT at runtime; default for local runs
ENV PORT=8080
EXPOSE 8080

CMD ["./entrypoint.sh"]
