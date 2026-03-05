# Narvo backend — Google Cloud Run
# Match Render runtime: Python 3.12
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Cloud Run injects PORT at runtime; default for local runs
ENV PORT=8080
EXPOSE 8080

# Bind to PORT so Cloud Run's injected port is respected (shell expands ${PORT:-8080})
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080}"]
