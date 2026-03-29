# Hugging Face Spaces — Python + ffmpeg backend
FROM python:3.11-slim

# Install ffmpeg (required for video rendering)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY . .

# Create runtime directories
RUN mkdir -p uploads outputs

# HF Spaces requires port 7860
EXPOSE 7860

# Single worker — whisper models are large and not thread-safe
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--timeout", "300", "--workers", "1", "--threads", "2", "app:app"]
