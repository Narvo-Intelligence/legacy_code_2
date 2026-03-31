# Narvo backend — Google Cloud Run
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code and entrypoint
COPY . .
RUN chmod +x entrypoint.sh

# Cloud Run injects PORT at runtime; default for local runs
ENV PORT=8080
EXPOSE 8080

# Entrypoint binds to $PORT so the container listens on the correct port
CMD ["./entrypoint.sh"]
