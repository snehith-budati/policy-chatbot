# Create a file called download_model.py
from huggingface_hub import snapshot_download
import os

# Create models directory if it doesn't exist
os.makedirs("./models/GLM-OCR-8bit", exist_ok=True)

# Download the model
snapshot_download(
    repo_id="mlx-community/GLM-OCR-8bit",
    local_dir="./models/GLM-OCR-8bit",
    local_dir_use_symlinks=False
)
print("✅ Model downloaded successfully!")