# Use Ubuntu for better compatibility with C++ builds
FROM ubuntu:22.04 AS builder

WORKDIR /app

# Prevent interactive prompts during apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies + Python
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    clang \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy BitNet source
COPY BitNet /app/BitNet

# Build BitNet with relaxed compiler flags to ignore warnings
WORKDIR /app/BitNet
RUN mkdir build && cd build && \
    cmake .. -DBITNET_X86_TL2=ON -DCMAKE_CXX_FLAGS="-fpermissive" -DCMAKE_C_FLAGS="-fpermissive" && \
    make -j$(nproc) llama-server

# Final stage
FROM python:3.10-slim-bullseye

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy built binaries
COPY --from=builder /app/BitNet/build/bin/llama-server /app/backend/BitNet/build/bin/llama-server
COPY --from=builder /app/BitNet/run_inference.py /app/backend/BitNet/run_inference.py

# Install Python requirements
COPY requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the rest
COPY . /app/backend/

ENV BITNET_CPP_DIR=/app/backend/BitNet
ENV BITNET_MODEL_PATH=/app/backend/BitNet/models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf
ENV BITNET_SERVER_URL=http://localhost:8080/completion

EXPOSE 5001 8080

RUN echo '#!/bin/bash\n\
    if [ ! -f "${BITNET_MODEL_PATH}" ]; then\n\
    echo "📥 Model missing. Downloading..."\n\
    mkdir -p $(dirname ${BITNET_MODEL_PATH})\n\
    huggingface-cli download microsoft/BitNet-b1.58-2B-4T-gguf ggml-model-i2_s.gguf --local-dir $(dirname ${BITNET_MODEL_PATH})\n\
    fi\n\
    ./backend/BitNet/build/bin/llama-server -m ${BITNET_MODEL_PATH} --port 8080 --host 0.0.0.0 &\n\
    cd backend && python app.py\n\
    ' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
