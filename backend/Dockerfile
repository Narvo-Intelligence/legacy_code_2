# Narvo backend — Google Cloud Run
# Match Render runtime: Python 3.12
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Cloud Run expects PORT env; default 8080
ENV PORT=8080
EXPOSE 8080

# Single process: Uvicorn serves the FastAPI app
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
