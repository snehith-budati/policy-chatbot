# Use a base image with Python 3.10 and build dependencies
FROM python:3.10-slim-bullseye AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    clang \
    && rm -rf /var/lib/apt/lists/*

# Copy only the BitNet C++ source to build
COPY BitNet /app/BitNet

# Build BitNet
WORKDIR /app/BitNet
RUN mkdir build && cd build && \
    cmake .. -DBITNET_X86_TL2=ON && \
    make -j$(nproc) llama-server

# Final stage
FROM python:3.10-slim-bullseye

WORKDIR /app

# Install runtime dependencies (poppler for pdf2image, tesseract for OCR fallback)
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy built binaries from builder stage
COPY --from=builder /app/BitNet/build/bin/llama-server /app/backend/BitNet/build/bin/llama-server
COPY --from=builder /app/BitNet/run_inference.py /app/backend/BitNet/run_inference.py

# Copy Python requirements first for better caching
COPY requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the rest of the backend files
COPY . /app/backend/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV BITNET_CPP_DIR=/app/backend/BitNet
ENV BITNET_MODEL_PATH=/app/backend/BitNet/models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf
ENV BITNET_SERVER_URL=http://localhost:8080/completion

# Expose ports
EXPOSE 5001 8080

# Create a start script
RUN echo '#!/bin/bash\n\
if [ ! -f "${BITNET_MODEL_PATH}" ]; then\n\
  echo "📥 Model missing. Downloading BitNet 2B 1.58-bit model from Hugging Face..."\n\
  mkdir -p $(dirname ${BITNET_MODEL_PATH})\n\
  huggingface-cli download microsoft/BitNet-b1.58-2B-4T-gguf ggml-model-i2_s.gguf --local-dir $(dirname ${BITNET_MODEL_PATH})\n\
fi\n\
./backend/BitNet/build/bin/llama-server -m ${BITNET_MODEL_PATH} --port 8080 --host 0.0.0.0 &\n\
cd backend && python app.py\n\
' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
