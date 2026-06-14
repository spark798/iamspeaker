# PROGRESS — iamspeaker 개발 기록 (Catch-up Log)

> **이 파일의 목적**: 작업이 중단돼도 이 문서 하나만 읽으면 현재 상태·결정·다음 할 일을 즉시 파악할 수 있게 한다.
> **갱신 규칙**: 의미 있는 작업/결정이 생길 때마다 (1) 아래 **현재 상태** 표, (2) **다음 할 일**, (3) **세션 로그**에 한 줄씩 남긴다. 새 세션 시작 시 §0 → §1 → §4 순으로 읽는다.

---

## 0. 한눈에 보기 (Resume Here)

| 항목 | 값 |
|------|-----|
| 프로젝트 | iamspeaker — 오픈소스 발표 연습 웹앱 (로컬 모델 우선) |
| 현재 단계 | **🎉 Phase 0 완료 (10/10)** — 기반 인프라 + 어댑터 골격 + Job Queue + UI 셸 + Docker/CI |
| 최근 갱신 | 2026-06-14 |
| 다음 액션 | **Milestone M1 — Walking Skeleton**: stub로 업로드→데모→녹음→리포트→개선 전 구간 관통 + Playwright E2E 골격 |
| 도구 | Node v22.22.3(nvm, default), pnpm 11.6.0(corepack). 셸마다 `. "$HOME/.nvm/nvm.sh"; nvm use default` 필요 |
| 설치 스택 | Next 15.5 · React 19 · TS 5.9(strict) · Tailwind v4 · Biome 1.9 · Vitest 3 · Playwright 1.60 |
| 읽을 문서 순서 | `PROGRESS.md`(본 문서) → `CLAUDE.md` → `DEVELOPMENT.md` → `docs/storyboard.md` |
| 코드 위치 | 아직 없음 (현재 폴더 = 기획 문서만) |

---

## 1. 현재 상태 (Status Board)

### 완료 ✅
- [x] 제품 기획 검토 (스토리보드 docx + 기존 CLAUDE.md)
- [x] 문서 5종 재구성: `CLAUDE.md` / `DEVELOPMENT.md` / `docs/storyboard.md` / `.env.example` / `PROGRESS.md`
- [x] 기술 스택 확정 (§2 결정 로그)
- [x] 헤르메스(로컬 Ollama `hermes3:8b`) 활용 방안 정의 + 동작 검증
- [x] 빠져 있던 엔지니어링 영역 계획 추가 (Job Queue, 오디오 파이프라인, 테스트, 보안, 관측성, i18n, CI)
- [x] **기반 정비**: git init(main), `LICENSE`(MIT), `.gitignore`, `README.md` 초안, `data/.gitkeep`, 초기 커밋
- [x] **리뷰 가드레일**: `.claude/agents/iamspeaker-reviewer.md` — 프로젝트 고유 규칙 검사 서브에이전트(범용 /code-review·/security-review 보완). 작업 청크 후 커밋 전 실행 권장

### 진행 중 🚧
- (없음)

### 대기 ⏳ (Phase 0 백로그 — 의존성 순, 위→아래)
1. [x] Next.js + Tailwind + pnpm 초기화, tsconfig strict, Biome/Vitest/Playwright ✅ (typecheck/lint/test/build 통과)
2. [x] **Config 모듈**(`lib/config.ts`) — Zod env 파싱(fail-fast, 빈문자열→미설정, 엔진 자동선택) + `scripts/preflight.ts`(ffmpeg/libreoffice/ollama/piper/whisper 점검) ✅
3. [x] **로깅/에러 토대** — pino(`lib/logger.ts`, 상관키 child) + 에러 헬퍼(`lib/errors/`, AppError·toApiError) + Error Boundary(`app/error.tsx`·`global-error.tsx`) ✅
4. [x] **도메인 타입**(`lib/domain/`) — slides/script/transcript/analysis/l1/qa + 배럴(index.ts, `export type *`) ✅
5. [x] Drizzle 스키마(10테이블) + 초기 마이그레이션(`lib/db/migrations/0000_*.sql`) + better-sqlite3 연결(`client.ts`/`index.ts`) + 마이그레이션 스크립트 ✅
6. [x] `lib/storage/` 경로 빌더(safeResolve/assertSafeSegment/safeFilename, uploadPath/recordingPath) — DATA_DIR 하위 정규화 + path-traversal 방어 ✅
7. [x] `lib/ai/types.ts`(Script/Tts/Stt/Qa/SlideCritic 인터페이스 + Adapters) + `factory.ts`(getter들, 현재 stub) + `lib/ai/stub/`(결정적 구현) + 재사용 계약 테스트(`test/contract/`) ✅
8. [x] Job Queue(`lib/jobs/queue.ts` JobQueue) + Worker(`worker.ts`, concurrency/폴링/핸들러레지스트리) + `GET /api/jobs/[id]/stream`(SSE) + 크래시 복구(recoverStalled) + instrumentation 워커 기동 ✅
9. [x] **Base UI shell** — `(session)` 레이아웃 + 스테퍼(SCR-01~08, 현재단계 aria-current) + `/upload` 자리표시자 + `/api/health`(DB+엔진) + 홈 CTA. 시작 시 자동 마이그레이션(D14). 실서버 기동 검증 ✅
10. [x] `scripts/setup-models.ts`(Whisper/Piper 멱등 다운로드) + `Dockerfile`(멀티스테이지, ffmpeg+libreoffice) + `docker-compose.yml`(app+ollama) + `.dockerignore` + `.github/workflows/ci.yml`(lint/typecheck/test/build) ✅
- **Phase 0 완료 조건 충족**: 셸 실서버 기동 확인(0-9), 자동 마이그레이션, CI 워크플로 작성. (docker/CI 런타임 검증은 사용자 환경/푸시 시)

### 대기 ⏳ (Milestone M1 — Walking Skeleton)
- [ ] stub 어댑터로 업로드→데모→녹음→리포트→개선 **전 구간 1회 관통** + Playwright E2E 골격
- 실제 AI 붙이기 전에 Job/SSE/Storage/DB 통합 검증.

> Phase 1(실제 엔진)·2·3 백로그는 `DEVELOPMENT.md` §14 참조. **주의: ko.json은 분석보다 먼저, i18n/fixture는 Phase 1 맨 앞.**
> 📌 메모(보류): 경쟁사 UX 리서치는 **Phase 1 화면 설계 직전 1회**만(상시 에이전트 X). 타겟·세부는 DEVELOPMENT §14 Phase 1 상단 참조.

---

## 2. 결정 로그 (Decision Log)

확정된 기술 결정 — 바꿀 땐 여기와 `DEVELOPMENT.md` §2를 함께 수정.

| # | 결정 | 사유 | 날짜 |
|---|------|------|------|
| D1 | 패키지 매니저 **pnpm** | 디스크 효율·워크스페이스 | 06-13 |
| D2 | DB **SQLite + Drizzle ORM/kit** | 셀프호스팅 단순 + 타입세이프 마이그레이션 | 06-13 |
| D3 | 입력 검증 **Zod** | API·어댑터 경계 런타임 검증 | 06-13 |
| D4 | 비동기 추론 = **SQLite jobs 테이블 + 인프로세스 워커 + SSE** | Redis 없이 셀프호스팅 단순 유지 | 06-13 |
| D5 | 오디오 **ffmpeg → 16kHz mono WAV** | Whisper.cpp 입력 규격 | 06-13 |
| D6 | 테스트 **Vitest + Playwright (stub 어댑터)** | 모델 없이 CI 통과 | 06-13 |
| D7 | 린트/포맷 **Biome**, 로깅 **pino** | 단일 툴·경량 | 06-13 |
| D8 | 슬라이드: PDF.js 렌더, PPTX는 LibreOffice headless→PDF | 의존 최소화 | 06-13 |
| D9 | **헤르메스는 개발 보조 + 로컬 검증 베드로만**, 제품 런타임은 `OLLAMA_HOST` HTTP 어댑터 사용 (MCP 의존성 런타임 배제) | 셀프호스팅 "클론 후 바로 동작" 원칙 보호 | 06-13 |
| D10 | **Walking-skeleton-first** — stub로 전 구간 관통(M1) 후 화면별 실제 엔진 | 통합 리스크 조기 발견, 중단·재개 강건 | 06-13 |
| D11 | **Config는 `lib/config.ts`**(Zod, fail-fast) + 시작 시 외부 바이너리 preflight | 잘못된 env로 늦게 깨지는 것 방지 | 06-13 |
| D12 | **도메인 타입은 `lib/domain/` 단일 진실원**, 어댑터/DB/분석이 공유 | 타입 중복·드리프트 방지 | 06-13 |
| D13 | **Node 20 → Node 22 LTS 상향** | pnpm 11이 node:sqlite(22.13+) 요구, Next 15도 22 권장 | 06-13 |
| D14 | **시작 시 마이그레이션 자동 적용**(instrumentation, 멱등) + init 실패 격리 | "클론 후 바로 동작" — 수동 db:migrate 없이 기동, 워커 크래시가 전 라우트 죽이지 않게 | 06-14 |

### 미해결/추후 결정 ❓
- next-intl vs 자체 경량 i18n (UI 다국어) — Phase 1 SCR 작업 시 확정
- 기본 Ollama 모델 태그 (llama3.1:8b vs qwen2.5 vs hermes3:8b) — 프롬프트 검증 후 확정

---

## 3. 헤르메스(로컬 Ollama) 활용 메모

- 환경: MCP 도구 `mcp__hermes__ask_hermes`(기본 `hermes3:8b`) + `list_local_models`. 설치 모델: `hermes3:8b` (4.7GB).
- **개발 보조**: 픽스처/더미데이터 생성, L1 규칙 brainstorm, 카피 초안, 분류·태깅 등 오프라인·대량 작업.
- **제품 검증 베드**: `OllamaScriptGenerator`/`QAGenerator`의 프롬프트·JSON 출력 스키마를 로컬 8B로 미리 검증 → "클라우드는 되는데 로컬은 깨짐" 케이스를 개발 중 포착.
- 검증 완료: Q&A 생성 프롬프트가 스키마(`difficulty`/`category`) 맞는 유효 JSON 반환 확인 (06-13).
- ⚠️ 제품 코드는 MCP가 아니라 `lib/ai/` Ollama HTTP 어댑터로 호출 (D9).

---

## 4. 다음 할 일 (Next Actions)

> 새 세션은 여기부터. 작업 착수 시 해당 항목을 §1 "진행 중"으로 옮기고, 끝나면 "완료"로.

1. **Phase 0 스캐폴딩 시작** — `DEVELOPMENT.md` §3 디렉토리 구조대로 Next.js 프로젝트 초기화.
2. 어댑터 인터페이스(`lib/ai/types.ts`)와 stub 구현부터 — CLAUDE.md §2가 단일 진실원.
3. Drizzle 스키마 작성 후 첫 마이그레이션 생성.
4. Job Queue 골격 + SSE 엔드포인트.

각 단계 착수 전 `CLAUDE.md` §6 체크리스트 통과.

---

## 5. 세션 로그 (Session Log)

새 항목은 위에 추가 (최신 우선).

### 2026-06-14 — Phase 0-10 Docker + CI (Phase 0 완료 🎉)
- `scripts/setup-models.ts`: Whisper ggml + Piper voice(.onnx/.onnx.json) 멱등 다운로드(스트리밍).
- `Dockerfile`: node:22-bookworm-slim 멀티스테이지(deps→build→runner), 런타임에 ffmpeg+libreoffice, CMD pnpm start(자동 마이그레이션).
- `docker-compose.yml`: app + ollama(볼륨), app은 OLLAMA_HOST=http://ollama:11434, ./data 마운트. `.dockerignore`.
- `.github/workflows/ci.yml`: pnpm install→lint→typecheck→test→build (Node 22).
- 검증: typecheck/lint/test(44) 통과. docker는 로컬 미설치라 compose 런타임 검증은 사용자 환경/CI에서.
- **Phase 0 전체 완료**. 다음: Milestone M1 Walking Skeleton.

### 2026-06-14 — Phase 0-9 Base UI shell
- `components/stepper.tsx`(client, usePathname): SCR-01~08 진행 스테퍼, 현재 단계 aria-current. `app/(session)/layout.tsx`: 헤더+스테퍼+본문 셸. `app/(session)/upload/page.tsx`: SCR-01 자리표시자.
- `app/api/health/route.ts`: DB(select 1) + 활성 엔진 보고(200/503). 홈에 "시작하기" CTA.
- 🐞 발견·수정: 실 DB에 마이그레이션 미적용 → instrumentation 워커가 `no such table: jobs`로 크래시 → 전 라우트 500. **시작 시 자동 마이그레이션 + try/catch 격리**로 해결(D14).
- 검증: 테스트 44개(stepper 2) + 실서버 기동 — `/`(CTA)·`/upload`(스테퍼)·`/api/health`({status:ok,db:ok,engines}) 모두 200.
- **다음**: Phase 0-10 Docker + CI(Phase 0 마지막).

### 2026-06-14 — Phase 0-8 Job Queue/Worker + SSE
- `lib/jobs/queue.ts`(JobQueue): enqueue/get/claimNext(트랜잭션 원자적 FIFO)/setProgress/complete/fail/recoverStalled(크래시 복구).
- `lib/jobs/worker.ts`(Worker): processOnce(테스트용)/start(폴링 루프, concurrency=config.JOB_CONCURRENCY, timer.unref)/stop. 핸들러 미등록·throw 시 failed 기록.
- `lib/jobs/index.ts`: getQueue/startAppWorker + 핸들러 레지스트리(현재 빈, Phase 1에서 등록).
- `app/api/jobs/[id]/stream/route.ts`: SSE 진행률(종료/abort 시 close). `instrumentation.ts`로 Node 런타임에서 워커 기동.
- DB 싱글턴을 지연 `getDb()`로 전환(빌드 부작용 방지), next.config `serverExternalPackages: better-sqlite3`.
- 테스트 42개(jobs 7) 통과, build 통과(SSE 라우트 동적 확인).
- **다음**: Phase 0-9 Base UI shell.

### 2026-06-14 — Phase 0-7 어댑터 골격
- `lib/ai/types.ts`: ScriptGenerator/Tts/Stt/QaGenerator/SlideCritic 어댑터 인터페이스(도메인 타입 기반) + `Adapters` 묶음. CLAUDE.md의 AudioBuffer를 서버용 `TtsResult`(Uint8Array)/`SttInput`(wavFilePath)으로 정정(문서도 갱신).
- `lib/ai/stub/`: 모델 없이 결정적 출력 내는 stub 5종(무음 WAV 생성 포함). Walking Skeleton·CI·계약 테스트용.
- `lib/ai/factory.ts`: getter들 — 현재 stub 반환, Phase 1에서 engines 기반 실제 구현으로 교체(인터페이스/계약 유지).
- `test/contract/adapter-contracts.ts`: 재사용 계약 스위트. stub+factory 양쪽에 적용. 실제 구현도 이걸 재사용.
- 테스트 35개 통과(계약 stub/factory 각 5 + getAdapters). typecheck/lint OK.
- **다음**: Phase 0-8 Job Queue/Worker + SSE.

### 2026-06-13 — Phase 0-6 storage 경로 빌더
- `lib/storage/index.ts`: `safeResolve()`(base 이탈 시 throw), `assertSafeSegment()`(구분자·`..`·널바이트 거부), `safeFilename()`(basename 정화), `uploadDir/uploadPath/recordingDir/recordingPath`, `ensureDir`, `StorageDirs`. 모두 DATA_DIR 하위로 정규화.
- 방어 전략: 디렉토리 세그먼트(sessionId 등)는 구분자 포함 시 throw, 사용자 파일명은 basename으로 정화(throw 아님). AppError(UNSAFE_PATH/UNSAFE_NAME) 사용.
- 테스트(storage.test.ts) 6케이스: 정상 경로/탈출 차단/정화. 전체 20개 통과, lint/typecheck OK.
- **다음**: Phase 0-7 어댑터 인터페이스+factory+stub+계약 테스트.

### 2026-06-13 — Phase 0-5 DB (Drizzle)
- `lib/db/schema.ts`: 10테이블(sessions/slides/scripts/recordings/analysis_results/slide_critiques/qa_sessions/qa_items/qa_answers/jobs). JSON 컬럼은 도메인 타입(`../domain`) 재사용, FK onDelete cascade, createdAt=timestamp_ms 기본값.
- `lib/db/client.ts`(createDb/resolveDbFile, WAL+foreign_keys=ON) + `index.ts`(db 싱글턴) + `migrate.ts`(`pnpm db:migrate`).
- `drizzle.config.ts` + `pnpm db:generate`로 초기 마이그레이션 `0000_*.sql` 생성·커밋. 스크립트: db:generate/migrate/studio.
- `lib/domain/job.ts`(JobType/JobStatus) 추가, 배럴 반영. better-sqlite3 allowBuilds 등록.
- 통합 테스트(test/integration/db.test.ts): 인메모리 마이그레이션 → 삽입/조회/JSON 왕복/기본값/FK 거부 검증. typecheck/lint/test(14개)/build 통과.
- **다음**: Phase 0-6 storage 경로 빌더.

### 2026-06-13 — Phase 0-4 도메인 타입
- `lib/domain/` 신설: slides(SlideContent/SlideCritique/TextDensity), script(Script/SlideScript/GenOptions/ScriptDiff/Tone/ScriptSource), transcript(TranscriptResult/TranscriptWord/FillerWordResult), analysis(AnalysisResult/PronunciationIssue/SlideTimeBreakdown), l1(L1Profile/PhonemeRule/ExpressionRule), qa(QAItem/QAFeedback/Difficulty/QACategory).
- `index.ts` 배럴(`export type *`)로 단일 진실원. 어댑터/DB/분석이 여기서 import.
- 타입 정합성 테스트(domain.test.ts) 추가. typecheck/lint/test(12개) 통과.
- **다음**: Phase 0-5 Drizzle 스키마 + 마이그레이션.

### 2026-06-13 — Phase 0-3 로깅/에러 토대
- `lib/logger.ts`: pino 로거(레벨=config.LOG_LEVEL, base app명, ISO 타임), `withContext()`로 req/job/session 상관키 child. 서버 전용.
- `lib/errors/index.ts`: `AppError`(code/status/expose) + `Errors.*` 생성기 + `toApiError()` — 5xx/비AppError는 내부 메시지 숨김(스택 누출 방지). 프레임워크 비의존(순수).
- `app/error.tsx`(RouteError) + `app/global-error.tsx`: App Router 에러 바운더리, 한국어 폴백 + 재시도.
- pino@9 추가. 검증: typecheck/lint/test(11개)/build 통과.
- **다음**: Phase 0-4 도메인 타입.

### 2026-06-13 — 리뷰 가드레일 추가
- `.claude/agents/iamspeaker-reviewer.md` 신설(read-only, model sonnet). 어댑터 패턴/로컬 우선/config 경유/도메인 타입/비동기 잡/보안 경계/마이그레이션 동반/stub·계약 테스트/i18n·a11y/커밋 태그를 검사. 범용 /code-review(버그)·/security-review를 대체하지 않고 보완. 매 작업 청크 후 커밋 전 실행 권장.
- 사용법: 작업 후 이 에이전트로 diff 리뷰 → 지적사항 반영 → 커밋.

### 2026-06-13 — Phase 0-2 Config 모듈
- `lib/config.ts`: Zod 스키마로 `.env.example` 전 항목 파싱. 기본값 우선(로컬 우선), 빈 문자열("KEY=")→미설정, 잘못된 값만 fail-fast(throw). `deriveEngines()`로 클라우드 키 유무에 따라 활성 엔진(script/tts/stt) 자동 선택. `config`/`engines` 싱글턴 export.
- `scripts/preflight.ts`: 활성 엔진 기준으로 ffmpeg(필수)/LibreOffice(권장)/Ollama·Piper·Whisper(엔진별 필수) 점검, 미충족 시 exit 1. zod 추가(zod@3).
- `package.json`에 `lint:fix` 스크립트 추가.
- 검증: typecheck/lint/test(7개) 통과. `pnpm preflight` 실측 — Ollama+hermes3:8b 감지, 오디오 바이너리는 미설치(예상, Phase 1에서 설치).
- **다음**: Phase 0-3 로깅/에러 토대.

### 2026-06-13 — Phase 0-1 스캐폴딩
- Node 미설치 → nvm 설치 후 Node 22 LTS(v22.22.3) + corepack pnpm 11.6.0. (D13: Node 20→22 상향)
- Next 15(App Router) + React 19 + TS strict + Tailwind v4 + Biome + Vitest + Playwright 수동 스캐폴딩 (기존 문서 폴더라 create-next-app 불가).
- 생성: package.json, tsconfig, next.config, postcss, app/{layout,page,globals.css}, biome.json, vitest.config+test/setup+smoke test, playwright.config, .nvmrc, pnpm-workspace.yaml(allowBuilds).
- 검증 통과: `pnpm typecheck` / `pnpm lint` / `pnpm test`(smoke) / `pnpm build` 모두 ✓.
- ⚠️ 셸마다 nvm 소싱 필요: `. "$HOME/.nvm/nvm.sh"; nvm use default`.
- **다음**: Phase 0-2 Config 모듈(`lib/config.ts`, Zod env 파싱 + preflight).

### 2026-06-13 — 로드맵 재검증 & 보강
- 의존성 관점으로 순서 재검증. 순서 오류 수정: `ko.json`을 분석 *앞*으로, 오디오 파이프라인+STT를 분석에서 분리·선행, Phase 0의 config/로깅을 앞으로.
- 빠진 토대 작업 추가: Config 모듈(+preflight), 도메인 타입(`lib/domain/`), 에러 프리미티브, Base UI shell, 슬라이드 렌더 파이프라인, UI i18n+fixture, 어댑터 계약 테스트, a11y 패스.
- **Walking Skeleton(M1)** 마일스톤 신설 — stub로 전 구간 관통 후 실제 엔진.
- 결정 D10~D12 추가. DEVELOPMENT.md §3/§9/§12/§14, PROGRESS.md 갱신.
- **다음**: Phase 0 1번(Next.js 초기화)부터.

### 2026-06-13 — 기반 정비
- 라이선스 **MIT** 확정. git init(main 브랜치).
- `LICENSE`, `.gitignore`(data/·.env·모델 가중치 제외), `README.md` 초안, `data/.gitkeep` 생성.
- 초기 커밋으로 베이스라인 확보.
- **다음**: Phase 0 스캐폴딩(Next.js+Tailwind+Drizzle+어댑터 stub+Job Queue).

### 2026-06-13 — 기획 정리 & 계획 수립
- Downloads/iamspeaker의 스토리보드 docx + 기존 CLAUDE.md 검토.
- 문서 4종으로 재구성: `docs/storyboard.md`(docx 변환), `DEVELOPMENT.md`(상세 계획 신설), `CLAUDE.md`(에이전트 가이드로 슬림화), `.env.example`(신설).
- 빠진 엔지니어링 영역 식별·반영: Job Queue, 오디오 파이프라인+분석 알고리즘, 모델 셋업 자동화, 테스트 전략, 보안, 관측성, UI i18n, Docker/CI.
- 기술 결정 D1~D9 확정 (§2).
- 헤르메스 = 로컬 Ollama 확인, Q&A 생성으로 동작 검증, 활용 방안 정의 (§3).
- 이 PROGRESS.md 신설 (catch-up 용).
- **다음**: Phase 0 스캐폴딩.
