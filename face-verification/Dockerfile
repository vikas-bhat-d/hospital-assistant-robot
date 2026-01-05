# face-verification/Dockerfile
FROM python:3.8-slim

WORKDIR /app

# System deps for dlib/face_recognition & Pillow
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libboost-all-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt

COPY . .

# Flask config
ENV FLASK_APP=service.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=8080

# URL of HMS backend (used in service.py when calling Node backend)
ENV BACKEND_URL=http://hms-backend:4000

EXPOSE 8080

# Use Flask CLI so we don't depend on an explicit app.run() in service.py
CMD ["python", "service.py"]
