#!/bin/sh
set -e

# 로컬 모델(Whisper ggml + Piper voice)을 data 볼륨에 1회 다운로드(멱등).
# 네트워크가 없으면 건너뛰고 앱은 그대로 기동(STT/TTS만 비활성).
echo "[entrypoint] ensuring local models (setup:models)…"
pnpm setup:models || echo "[entrypoint] setup:models 실패/건너뜀 — STT/TTS가 비활성일 수 있음"

exec pnpm start
