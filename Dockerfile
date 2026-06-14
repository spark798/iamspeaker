# syntax=docker/dockerfile:1
# Node 22 (glibc) — better-sqlite3 prebuilt 사용, ffmpeg/libreoffice 설치 용이.
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# 의존성 설치 (allowBuilds로 네이티브 빌드 실행)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 빌드
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# 런타임
FROM base AS runner
ENV NODE_ENV=production
# 외부 의존성: 오디오 변환(ffmpeg), 슬라이드 변환(libreoffice headless)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg libreoffice \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
EXPOSE 3000
# 시작 시 instrumentation이 마이그레이션 자동 적용 + 워커 기동
CMD ["pnpm", "start"]
