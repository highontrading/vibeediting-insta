#!/usr/bin/env bash
# One-time (per session) setup for the Python tools: narration (Kokoro TTS) and background removal (rembg).
# Models come from GitHub releases, so no Hugging Face access is required.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -x .venv/bin/python ] || python3 -m venv .venv
.venv/bin/pip install -q --disable-pip-version-check kokoro-onnx soundfile "rembg[cpu]" pillow
mkdir -p models/kokoro
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -s models/kokoro/kokoro-v1.0.onnx ] || curl -sSL -o models/kokoro/kokoro-v1.0.onnx "$base/kokoro-v1.0.onnx"
[ -s models/kokoro/voices-v1.0.bin ] || curl -sSL -o models/kokoro/voices-v1.0.bin "$base/voices-v1.0.bin"
echo "python tools ready"
