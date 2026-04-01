#!/bin/bash
cd backend/BitNet
./build/bin/llama-server -m models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf --port 8080 &
SERVER_PID=$!

cd ../..
source venv/bin/activate
cd backend
export BITNET_CPP_DIR="$PWD/BitNet"
export BITNET_MODEL_PATH="$PWD/BitNet/models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf"
python app.py &
FLASK_PID=$!

cd ../frontend
npm start &
FRONTEND_PID=$!

echo "All services started. Use 'fg' to bring any to foreground, or Ctrl+C to stop."
wait $SERVER_PID $FLASK_PID $FRONTEND_PID