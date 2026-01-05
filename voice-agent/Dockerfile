# voice-agent/Dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirement.txt ./requirements.txt
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt

COPY . .

# LiveKit and backend configuration (override via docker-compose or .env)
ENV LIVEKIT_URL=
ENV LIVEKIT_API_KEY=
ENV LIVEKIT_API_SECRET=
ENV BACKEND_URL=

EXPOSE 8082

CMD ["./entrypoint.sh"]
