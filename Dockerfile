# syntax=docker/dockerfile:1
# Node 22 (glibc) — better-sqlite3 prebuilt 사용, ffmpeg/libreoffice 설치 용이.
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# 의존성 설치 (네이티브 빌드 승인은 pnpm-workspace.yaml allowBuilds)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Next 빌드
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Whisper.cpp 빌드(별도 스테이지 → 런타임엔 바이너리만 복사)
FROM debian:bookworm-slim AS whisper
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git build-essential cmake \
  && rm -rf /var/lib/apt/lists/*
# GGML_NATIVE=OFF: 이식성(-march=native 비활성). BUILD_SHARED_LIBS=OFF: 정적 링크 →
# whisper-cli 단일 바이너리만 런타임에 복사 가능(libwhisper.so 의존 제거).
RUN git clone --depth 1 https://github.com/ggerganov/whisper.cpp /w \
  && cmake -S /w -B /w/build -DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=OFF -DBUILD_SHARED_LIBS=OFF \
  && cmake --build /w/build -j --target whisper-cli

# 런타임
FROM base AS runner
ENV NODE_ENV=production
# 외부 의존성: 오디오 변환(ffmpeg), 슬라이드 변환(libreoffice), TTS(piper via pip),
# whisper 런타임 라이브러리(libgomp1, libstdc++ 포함).
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ffmpeg libreoffice libgomp1 python3 python3-pip \
  && pip3 install --no-cache-dir --break-system-packages piper-tts \
  && rm -rf /var/lib/apt/lists/*
# whisper-cli 바이너리 (config 기본 WHISPER_BIN=whisper-cli)
COPY --from=whisper /w/build/bin/whisper-cli /usr/local/bin/whisper-cli
COPY --from=build /app ./
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3000
# entrypoint: 모델 다운로드(setup:models, 멱등) 후 next start.
# DB 마이그레이션/워커는 첫 요청 시 lazy(getDb/getQueue)로 적용됨.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
