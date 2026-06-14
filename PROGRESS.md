# PROGRESS — iamspeaker 개발 기록 (Catch-up Log)

> **이 파일의 목적**: 작업이 중단돼도 이 문서 하나만 읽으면 현재 상태·결정·다음 할 일을 즉시 파악할 수 있게 한다.
> **갱신 규칙**: 의미 있는 작업/결정이 생길 때마다 (1) 아래 **현재 상태** 표, (2) **다음 할 일**, (3) **세션 로그**에 한 줄씩 남긴다. 새 세션 시작 시 §0 → §1 → §4 순으로 읽는다.

---

## 0. 한눈에 보기 (Resume Here)

| 항목 | 값 |
|------|-----|
| 프로젝트 | iamspeaker — 오픈소스 발표 연습 웹앱 (로컬 모델 우선) |
| 현재 단계 | **Phase 0-2 Config 완료** (`lib/config.ts` + `scripts/preflight.ts`, 테스트 7개 통과) |
| 최근 갱신 | 2026-06-13 |
| 다음 액션 | Phase 0-3: 로깅/에러 토대 (pino `lib/logger.ts` + `lib/errors/` + Error Boundary) |
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

### 진행 중 🚧
- (없음)

### 대기 ⏳ (Phase 0 백로그 — 의존성 순, 위→아래)
1. [x] Next.js + Tailwind + pnpm 초기화, tsconfig strict, Biome/Vitest/Playwright ✅ (typecheck/lint/test/build 통과)
2. [x] **Config 모듈**(`lib/config.ts`) — Zod env 파싱(fail-fast, 빈문자열→미설정, 엔진 자동선택) + `scripts/preflight.ts`(ffmpeg/libreoffice/ollama/piper/whisper 점검) ✅
3. [ ] **로깅/에러 토대** — pino + API 에러 헬퍼 + React Error Boundary  ← 다음
4. [ ] **도메인 타입**(`lib/domain/`) — SlideContent/Script/TranscriptResult/GenOptions 등 공유
5. [ ] Drizzle 스키마 + 초기 마이그레이션 (`lib/db/`)
6. [ ] `lib/storage/` 경로 빌더(검증), `DATA_DIR`
7. [ ] `lib/ai/types.ts` 어댑터 인터페이스 + `factory.ts` + **stub 어댑터** + **계약 테스트**
8. [ ] Job Queue/Worker 골격 + `GET /api/jobs/:id/stream` (SSE) + 크래시 복구
9. [ ] **Base UI shell** — 루트 레이아웃·디자인 토큰·`(session)` 스테퍼·헬스 라우트
10. [ ] `scripts/setup-models.ts` + Docker Compose(app+ollama) + GitHub Actions CI  ·  [x] `.env.example`
- **Phase 0 완료 조건**: 앱 셸이 뜨고, env 미설정 시 친절한 에러, CI 초록.

### 대기 ⏳ (Milestone M1 — Walking Skeleton)
- [ ] stub 어댑터로 업로드→데모→녹음→리포트→개선 **전 구간 1회 관통** + Playwright E2E 골격
- 실제 AI 붙이기 전에 Job/SSE/Storage/DB 통합 검증.

> Phase 1(실제 엔진)·2·3 백로그는 `DEVELOPMENT.md` §14 참조. **주의: ko.json은 분석보다 먼저, i18n/fixture는 Phase 1 맨 앞.**

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
