import os, sys, subprocess, shutil, platform
BITNET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'BitNet')
MODEL_ID = 'tiiuae/Falcon3-1B-Instruct-1.58bit'
QUANT = 'i2_s'

def run(cmd, **kwargs):
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, **kwargs)
    if result.returncode != 0:
        print(f"FAILED (exit {result.returncode}): {result.stderr or result.stdout}")
        sys.exit(result.returncode)
    return result

print("\n=== BitNet 1.58b Setup (Bulletproof macOS Edition) ===\n")
if not os.path.isdir(BITNET_DIR):
    run(['git', 'clone', '--recursive', 'https://github.com/microsoft/BitNet.git', BITNET_DIR])

print("[1/3] Installing deps...")
# Fixed: ALWAYS use --break-system-packages on macOS
run([sys.executable, '-m', 'pip', 'install', '-r', os.path.join(BITNET_DIR, 'requirements.txt'), '-q', '--break-system-packages'], check=False)

print("[2/3] Setting up environment...")
# Fixed: ใช้ -hr instead of -md with CORRECT casing for BitNet
run([sys.executable, 'setup_env.py', '-hr', MODEL_ID, '-q', QUANT], cwd=BITNET_DIR)

print("[3/3] Checking model status...")
model_path = os.path.join(BITNET_DIR, 'models', 'Falcon3-1B-Instruct-1.58bit', f'ggml-model-{QUANT}.gguf')
# Fallback check for alternate path
if not os.path.isfile(model_path):
    model_path = os.path.join(BITNET_DIR, 'models', 'Falcon3-1B-Instruct-1.58bit', f'ggml-model-{QUANT}.gguf')

if os.path.isfile(model_path):
    print(f"✅ Success! REAL BitNet 1.58b is ready at: {model_path}")
else:
    print(f"❌ Setup finished but model file was not found. Check BitNet/models/ folder.")
