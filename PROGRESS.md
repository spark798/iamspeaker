# PROGRESS — iamspeaker 개발 기록 (Catch-up Log)

> **목적**: 작업이 중단돼도 이 문서 하나로 현재 상태·결정·다음 할 일을 파악한다.
> **갱신 규칙**: 의미 있는 변화마다 §0 표 / §1 상태 / §4 다음 할 일 / §5 로그를 갱신. 새 세션은 §0 → §1 → §4 순으로 읽는다. (세부 이력은 git log / 커밋 메시지)

---

## 0. 한눈에 보기 (Resume Here)

| 항목 | 값 |
|------|-----|
| 프로젝트 | iamspeaker — 오픈소스 발표 연습 웹앱 (로컬 모델 우선) |
| 위치 | `/Users/seunghpark/Downloads/iamspeaker` (git main) · GitHub **spark798/iamspeaker (private)**, **CI 그린** |
| 현재 단계 | **Phase 1 진행 중** — SCR-01/01b/02/03 + LLM·파서·i18n 완료 |
| 다음 액션 | **오디오 경로**: `lib/audio`(ffmpeg 정규화) + WhisperCpp STT 어댑터 + 분석 엔진(WPM/필러) → SCR-04 녹음·SCR-05 리포트 (§4) |
| 최근 갱신 | 2026-06-17 |
| 셸 준비 | `export PATH="$HOME/.local/bin:$PATH"; . "$HOME/.nvm/nvm.sh"; nvm use default` (비대화형 셸 필수) |
| 로컬 도구 | Node 22(nvm)·pnpm 11(corepack) / ffmpeg 6·whisper-cli·cmake·gh → `~/.local/bin` / Ollama `hermes3:8b` / piper 보류 |
| 스택 | Next 15·React 19·TS 5.9 strict·Tailwind 4·Biome·Vitest+Playwright·Drizzle+better-sqlite3·next-intl·pino·zod |
| 테스트 | 62 통과 (+5 live-gated skip) + Playwright E2E. CI(lint/typecheck/test/build/E2E) 그린 |
| 문서 순서 | `PROGRESS.md` → `CLAUDE.md`(규칙) → `DEVELOPMENT.md`(계획) → `docs/storyboard.md` |

---

## 1. 현재 상태 (Status Board)

- **Phase 0 ✅ (10/10)** — 기반 인프라: config(Zod+preflight)·로깅/에러(pino)·도메인타입(`lib/domain`)·DB(Drizzle 10테이블)·storage(path-traversal 방어)·어댑터 골격(types/stub/factory/계약테스트)·Job Queue/Worker+SSE·Base UI 셸·Docker/CI.
- **Milestone M1 ✅** — stub로 전 구간 관통(세션→데모→워커→스크립트) + E2E 골격.
- **Phase 1 진행 중**:

| 기능 | 상태 |
|------|------|
| 실제 Ollama LLM 어댑터 (script/critique/qa) + 출력 Zod 검증 + 프롬프트 정합성(`alignSegmentsToSlides`) | ✅ |
| UI i18n (next-intl, ko/en) + 공유 샘플(`lib/samples`) + `pnpm db:seed` | ✅ |
| 슬라이드 파서 (PDF=unpdf, PPTX=fflate+노트) + `parse` 잡 | ✅ |
| SCR-01 업로드 폼 (멀티파트 + 매직바이트 검증 → storage → parse) | ✅ |
| SCR-01b 슬라이드 분석 (critique 잡 + **규칙 기반 폴백**, 무LLM 동작) | ✅ |
| SCR-02 AI 데모 (데모 잡 → SSE → 슬라이드별 스크립트) | ✅ |
| SCR-03 편집기 (편집·버전 저장 + 예상시간 + 데모 참조) | ✅ |
| **오디오 경로** (STT·분석·SCR-04 녹음·SCR-05 리포트) | ⏳ 다음 |
| SCR-06 개선(improve 잡) · SCR-07 진행/다국어 · SCR-08 Q&A · TTS(piper) | ⏳ 대기 |

> 화면 시각 렌더(LibreOffice PPTX→PDF + PDF.js)는 추후. Phase 2/3 백로그는 `DEVELOPMENT.md` §14.

---

## 2. 결정 로그 (Decision Log)

바꿀 땐 여기와 `DEVELOPMENT.md` §2를 함께 수정.

| # | 결정 | 사유 | 날짜 |
|---|------|------|------|
| D1 | 패키지 매니저 **pnpm** | 디스크 효율·워크스페이스 | 06-13 |
| D2 | DB **SQLite + Drizzle ORM/kit** | 셀프호스팅 단순 + 타입세이프 마이그레이션 | 06-13 |
| D3 | 입력 검증 **Zod** | API·어댑터 경계 런타임 검증 | 06-13 |
| D4 | 비동기 추론 = **SQLite jobs 테이블 + 인프로세스 워커 + SSE** | Redis 없이 셀프호스팅 단순 | 06-13 |
| D5 | 오디오 **ffmpeg → 16kHz mono WAV** | Whisper.cpp 입력 규격 | 06-13 |
| D6 | 테스트 **Vitest + Playwright (stub 어댑터)** | 모델 없이 CI 통과 | 06-13 |
| D7 | 린트/포맷 **Biome**, 로깅 **pino** | 단일 툴·경량 | 06-13 |
| D8 | 슬라이드: PDF.js 렌더, PPTX는 LibreOffice headless→PDF | 의존 최소화 | 06-13 |
| D9 | **헤르메스는 개발 보조/검증 베드만**, 제품 런타임은 `OLLAMA_HOST` HTTP(MCP 배제) | "클론 후 바로 동작" 보호 | 06-13 |
| D10 | **Walking-skeleton-first** (stub 전 구간 → 화면별 실제 엔진) | 통합 리스크 조기 발견 | 06-13 |
| D11 | **Config `lib/config.ts`**(Zod fail-fast) + 시작 시 preflight | env 오류 조기 발견 | 06-13 |
| D12 | **도메인 타입 `lib/domain/` 단일 진실원** | 타입 중복·드리프트 방지 | 06-13 |
| D13 | **Node 22 LTS** | pnpm 11(node:sqlite 22.13+) / Next 15 | 06-13 |
| D14 | **시작 시 멱등 마이그레이션** | 수동 db:migrate 없이 기동 | 06-14 |
| D15 | **instrumentation 제거 → 지연 기동**(마이그레이션=`getDb()`, 워커=`getQueue()` 첫 호출) | Next dev의 better-sqlite3 엣지 번들 500 회피 | 06-15 |
| D16 | **E2E/CI는 `USE_STUB_ADAPTERS=1`** | 모델 없이 결정적 E2E | 06-15 |

### 미해결/추후 ❓
- 기본 Ollama 모델 태그: 코드 기본 `llama3.1:8b` vs 실사용 `hermes3:8b` → README 안내 또는 기본값 재검토.
- 잡 **재시도(지수 백오프)**: `jobs.attempt` 컬럼 마이그레이션 필요 → 추후.
- **TTS(piper)**: macOS 릴리스 깨짐 → 소스 빌드 / `say` dev 폴백 / Docker(linux) 중 택1, 추후.
- 응답 DTO 타입 공유(컴포넌트가 Slide/Critique 인라인 재정의) → `lib/api/dto` 검토(낮음).

---

## 3. 헤르메스(로컬 Ollama) 메모

- `hermes3:8b`(Ollama, 4.7GB). MCP 도구는 **개발/검증 베드**로만. 제품은 `lib/ai/ollama` HTTP 어댑터 사용(D9).
- 라이브 검증: `OLLAMA_LIVE=1 OLLAMA_MODEL=hermes3:8b pnpm test`(어댑터 계약), 또는 `OLLAMA_MODEL=hermes3:8b pnpm start`(실 데모).
- 품질 진화 루프(eval-prompts/피드백)는 보류 — `DEVELOPMENT.md` §8.1.

---

## 4. 다음 할 일 (오디오 경로)

> 도구 설치 완료(ffmpeg/whisper). 아래는 무설치 코드 작업. 착수 전 `CLAUDE.md` §6 체크리스트, 청크 후 `iamspeaker-reviewer`.

1. **`lib/audio/`** — ffmpeg로 업로드 녹음 → 16kHz mono WAV 정규화 (+무음 트림/길이). 순수 로직은 단위 테스트, ffmpeg 호출은 배열 spawn.
2. **WhisperCpp STT 어댑터** (`lib/ai/whispercpp`) — whisper-cli 호출 → word-level `TranscriptResult`. `pnpm setup:models`로 `ggml-base.en` 다운로드. factory `getStt()` 교체(+계약 테스트 재사용).
3. **분석 엔진** (`lib/analysis/`) — WPM / 필러워드(언어별 사전) / 슬라이드 시간배분. 순수 함수 + Whisper 출력 fixture 테스트.
4. **SCR-04 녹음** (MediaRecorder) → `POST /recordings`(storage) → `analyze` 잡 → **SCR-05 리포트** UI.
5. 이어서 **SCR-06 개선** (`improve` 잡 + L1 프로필).

---

## 5. 세션 로그 (요약, 최신 우선)

- **2026-06-17** — 리뷰#2 보완: API 라우트 8개 5xx 로깅 통일(`errorResponse`), SSE 라우트 try/catch, i18n 고아키(`upload.phaseNote`) 제거·`home.phase` 현행화. PROGRESS 정리.
- **2026-06-16** — 오디오 도구 설치(ffmpeg 6·whisper.cpp 빌드·cmake; piper 릴리스 깨져 보류). GitHub 연동(gh 설치·인증·private 레포·push). **CI 그린** — `data/` 디렉토리 미추적으로 인한 E2E 500 수정(`createDb` 부모 mkdir + `.gitignore data/*`). Playwright E2E 활성화(`USE_STUB_ADAPTERS`) + `next dev` 500 수정(instrumentation 제거→지연 기동, D15/D16).
- **2026-06-15** — SCR-01b 슬라이드 분석 + Slide Critic 규칙 폴백(리뷰#1).
- **2026-06-14** — 전체 리뷰#1 + 싼 수정(잡 타임아웃 등). Phase 1 화면: SCR-01 업로드 / SCR-02 데모 / SCR-03 편집기. 슬라이드 파서. UI i18n+seed. 실제 Ollama 어댑터 + 프롬프트 정합성. **M1 Walking Skeleton**. Phase 0-7~0-10(어댑터골격/JobQueue+SSE/UI셸/Docker·CI). 자동 마이그레이션(D14).
- **2026-06-13** — 기획·계획 재구성(CLAUDE/DEVELOPMENT/storyboard/.env), 로드맵 재검증, 리뷰 가드레일 에이전트, 기반 정비(MIT·git init). Phase 0-1~0-6(스캐폴딩/config/로깅·에러/도메인/DB/storage). 헤르메스 검증. 결정 D1~D12.
