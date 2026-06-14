# iamspeaker — 개발 계획 (DEVELOPMENT)

> 이 문서는 **상세 엔지니어링 계획**이다. 제품/화면 명세는 [`docs/storyboard.md`](docs/storyboard.md), AI 에이전트 작업 규칙은 [`CLAUDE.md`](CLAUDE.md)를 본다.
> 기술 결정은 §2에 확정 사유와 함께 기록한다(경량 ADR 역할). 결정을 바꿀 땐 이 표를 먼저 수정한다.

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js App Router)          │
│  SCR-01 업로드 → SCR-01b 분석 → SCR-02 데모 → SCR-03 편집  │
│  → SCR-04 녹음 → SCR-05 리포트 → SCR-06 개선 → SCR-08 Q&A  │
│  → SCR-07 진행기록/다국어                                   │
└───────────────────────┬─────────────────────────────────┘
                         │ Server Actions / REST + SSE(진행률)
┌───────────────────────▼─────────────────────────────────┐
│              Backend (Next.js API Routes, 동일 레포)        │
│                                                             │
│  요청 핸들러(thin) ──► Job Queue(SQLite) ──► Worker(인프로세스)│
│                                              │              │
│   ┌──────────────┐ ┌──────────────┐ ┌──────▼───────────┐  │
│   │ Slide Parser │ │ Script Gen   │ │ Speech Analysis  │  │
│   │ (pptx/pdf)   │ │ (LLM Adapter)│ │ (STT + 분석엔진) │  │
│   ├──────────────┤ ├──────────────┤ ├──────────────────┤  │
│   │ TTS Adapter  │ │ L1 Profile   │ │ Slide Critic     │  │
│   ├──────────────┤ ├──────────────┤ ├──────────────────┤  │
│   │ Q&A Generator│ │ Diff/Improve │ │ Audio Pipeline   │  │
│   └──────────────┘ └──────────────┘ │ (ffmpeg 정규화)  │  │
│                                       └──────────────────┘  │
│   Storage: 로컬 파일(/data) + SQLite(Drizzle)               │
└─────────────────────────────────────────────────────────┘
```

### 1.1 모듈 책임 / MVP 포함

| 모듈 | 책임 | MVP |
|------|------|-----|
| Slide Parser | PPTX/PDF에서 텍스트·구조·노트 추출 | O |
| Script Generator | 슬라이드 → 발표 스크립트 (LLM Adapter) | O |
| TTS Adapter | 스크립트 → 음성 (Piper 기본) | O |
| STT Engine | 녹음 → 텍스트 + word timestamp (Whisper.cpp) | O |
| Audio Pipeline | 입력 오디오 → 16kHz mono WAV 정규화, 길이/무음 검출 | O |
| Speech Analysis | WPM·필러워드·발음 정확도·시간 배분 | O |
| L1 Profile | 모국어 기반 발음/표현 오류 패턴 매칭 | O |
| Diff/Improve | 원본 vs 개선 스크립트 비교 (LLM Adapter) | O |
| Slide Critic | 정보 밀도·시간 대비 슬라이드 수·구조 분석 | O |
| Q&A Generator | 예상 질문 생성 + 답변 평가 | O |
| Job Queue/Worker | 장시간 추론 비동기 처리 + 진행률 | O |
| Storage | 세션/녹음/스크립트/분석결과 저장 (SQLite + 파일) | O |
| Multilingual Export | 번역 + TTS + SRT | Phase 2 |
| Progress Tracking | 회차별 추이 | Phase 2 |
| Video Analysis | 시선/제스처 | Phase 3 |

---

## 2. 기술 스택 (확정 + 사유)

| 영역 | 결정 | 사유 |
|------|------|------|
| 런타임 | **Node 20 LTS** | Next.js 14+ / better-sqlite3 호환 |
| 프레임워크 | **Next.js (App Router) + React** | SSR + Server Actions로 백엔드 일원화 |
| 패키지 매니저 | **pnpm** | 디스크 효율, 빠른 설치, 워크스페이스 |
| 스타일 | **TailwindCSS** | 디자인 토큰 일관성 (`/mnt/skills/public/frontend-design` 참고) |
| 전역 상태 | 기본 React 상태 + Server Actions, 필요 시 **Zustand** | Redux 금지(오버엔지니어링) |
| DB | **SQLite (better-sqlite3)** | 셀프호스팅 단순화 1순위 |
| DB 레이어/마이그레이션 | **Drizzle ORM + drizzle-kit** | 타입세이프 스키마, `drizzle-kit generate/migrate` 버전 관리 |
| 입력 검증 | **Zod** | API·어댑터 경계 런타임 검증, 타입 추론 공유 |
| 비동기 추론 | **SQLite `jobs` 테이블 + 인프로세스 워커 + SSE** | Redis/외부 브로커 없이 셀프호스팅 단순 유지 |
| 오디오 변환 | **ffmpeg** (spawn) | 모든 입력 → 16kHz mono WAV (Whisper 규격) |
| 슬라이드 렌더 | **PDF.js**, PPTX는 **LibreOffice headless**로 PDF 변환 후 렌더 | 추가 런타임 의존 최소화 |
| 테스트 | **Vitest**(단위/통합) + **Playwright**(E2E) | 어댑터 단위 테스트 + 전체 루프 1회 완주 검증 |
| 린트/포맷 | **Biome** | lint+format 단일 툴, 빠름 |
| 로깅 | **pino** | 구조화 JSON 로그, 경량 |
| CI | **GitHub Actions** | lint → typecheck → test → build |
| 컨테이너 | **Docker Compose** | app + Ollama + (Piper/Whisper 바이너리 포함 이미지) |

> 클라우드 어댑터(Claude/OpenAI/ElevenLabs/Azure)는 모두 **선택적**. 환경변수 존재 시 우선, 없으면 로컬 폴백. 자세한 어댑터 규약은 `CLAUDE.md` §3 참조.

---

## 3. 디렉토리 구조

```
iamspeaker/
├─ app/
│  ├─ (session)/
│  │  ├─ upload/            # SCR-01
│  │  ├─ critique/          # SCR-01b
│  │  ├─ demo/              # SCR-02
│  │  ├─ editor/            # SCR-03
│  │  ├─ record/            # SCR-04
│  │  ├─ report/            # SCR-05
│  │  ├─ improve/           # SCR-06
│  │  ├─ qa/                # SCR-08
│  │  └─ progress/          # SCR-07
│  └─ api/                  # thin route handlers → lib 호출
├─ lib/
│  ├─ ai/
│  │  ├─ types.ts           # 어댑터 인터페이스 (단일 진실원)
│  │  ├─ factory.ts         # 환경변수 기반 어댑터 선택
│  │  ├─ script/            # ollama / claude / openai 구현
│  │  ├─ tts/               # piper / elevenlabs
│  │  ├─ stt/               # whispercpp / openai / azure
│  │  ├─ qa/                # Q&A generator
│  │  ├─ slide-critic/
│  │  ├─ l1-profiles/       # ko.json, ja.json ...
│  │  └─ prompts/           # 버전 관리되는 프롬프트 템플릿
│  ├─ analysis/             # wpm / filler / pronunciation / time-breakdown
│  ├─ audio/                # ffmpeg 정규화, 무음/길이 검출
│  ├─ slides/               # pptx/pdf 파서, libreoffice 변환
│  ├─ jobs/                 # queue, worker, job 타입
│  ├─ db/                   # drizzle 스키마, 마이그레이션, 쿼리
│  └─ storage/              # 파일 경로 관리, 검증(path traversal 방지)
├─ scripts/
│  ├─ setup-models.ts       # Piper voice / Whisper 모델 다운로드
│  └─ seed.ts               # 예제 슬라이드/세션 시드
├─ docs/
│  ├─ storyboard.md
│  └─ adr/                  # (선택) 개별 의사결정 기록
├─ data/                    # 런타임 산출물 (gitignore)
│  ├─ uploads/  recordings/  models/  iamspeaker.db
├─ test/
│  ├─ unit/  integration/  e2e/  fixtures/
├─ docker-compose.yml
├─ Dockerfile
├─ .env.example
├─ CLAUDE.md
└─ DEVELOPMENT.md
```

---

## 4. 데이터 모델 + 마이그레이션

Drizzle 스키마는 `lib/db/schema.ts`에 정의하고, `drizzle-kit generate`로 마이그레이션 SQL을 생성해 `lib/db/migrations/`에 커밋한다. 스키마 변경 시 **반드시 마이그레이션을 함께 커밋**한다.

핵심 테이블(개념): `Session`(모국어·발표언어·톤·목표시간) → `Slide` → `Script`(version, source: ai_demo|user|ai_improved) → `Recording` → `AnalysisResult`(wpm, fillerWords, slideTimeBreakdown, pronunciationIssues[l1Related]) / `SlideCritiqueResult` / `QASession` → `QAItem`(difficulty, category) → `QAAnswer`(relevanceScore, improvedAnswer) / `Job`(상태·진행률·에러).

전체 필드 정의는 `lib/db/schema.ts`를 단일 진실원으로 삼는다(문서와 코드 이중화 방지). 초기 스키마 초안은 기존 CLAUDE.md §4의 타입 정의를 기준으로 한다.

### Job 테이블 (신규)
```ts
Job {
  id: string
  type: 'parse'|'demo'|'critique'|'analyze'|'improve'|'qa_generate'|'qa_evaluate'|'export'
  sessionId: string | null
  status: 'queued'|'running'|'succeeded'|'failed'
  progress: number          // 0~100
  payload: json             // 입력 인자
  result: json | null
  error: string | null
  createdAt, startedAt, finishedAt
}
```

---

## 5. 화면 ↔ API ↔ 모듈 매핑

| 화면 | 주요 API | 비동기 Job | 모듈 |
|------|---------|-----------|------|
| SCR-01 업로드 | `POST /api/sessions` (슬라이드+설정+모국어) | `parse` | Slide Parser |
| SCR-01b 분석 | `POST /api/sessions/:id/critique` | `critique` | Slide Critic |
| SCR-02 AI 데모 | `POST /api/sessions/:id/demo` | `demo` | Script Gen, TTS |
| SCR-03 편집기 | `PUT /api/sessions/:id/scripts/:version` | - | - |
| SCR-04 녹음 | `POST /api/sessions/:id/recordings` | - | Storage |
| SCR-05 리포트 | `POST /api/recordings/:id/analyze` | `analyze` | STT, Speech Analysis, L1 |
| SCR-06 개선 | `POST /api/recordings/:id/improve` | `improve` | Script Gen(improve), L1 |
| SCR-08 Q&A | `POST /api/sessions/:id/qa/generate`, `POST /api/qa/:itemId/answer` | `qa_generate`/`qa_evaluate` | Q&A Generator |
| SCR-07 진행/다국어 | `GET /api/sessions/:id/progress`, `POST /api/sessions/:id/export` | `export` | Multilingual(Phase 2) |
| (공통) 진행률 | `GET /api/jobs/:id/stream` (SSE) | - | Job Queue |

---

## 6. 비동기 작업 / Job Queue 설계 (신규)

로컬 추론(LLM/TTS/STT)은 수 초~수 분이 걸린다. 요청-응답 동기 처리 대신:

1. API 핸들러는 입력 검증(Zod) 후 `jobs`에 레코드 삽입하고 `jobId` 즉시 반환.
2. **인프로세스 워커**가 `JOB_CONCURRENCY`(기본 1) 만큼 큐를 폴링/실행. 로컬 모델 자원 보호를 위해 기본 직렬.
3. 프런트는 `GET /api/jobs/:id/stream`(SSE)으로 `progress`/`status` 구독. SSE 미지원 환경은 폴링 폴백.
4. 실패 시 `error` 기록 + 지수 백오프 재시도(최대 N회), UI에 사용자 친화 메시지.
5. 서버 재시작 시 `running` 상태로 남은 작업은 `queued`로 복구(크래시 안전).

> 외부 브로커(Redis 등) 미사용 — 셀프호스팅 단순화 원칙. 부하가 커지면 Phase 2에서 별도 워커 프로세스로 분리 가능하도록 큐 인터페이스를 추상화한다.

---

## 7. 오디오 처리 파이프라인 (신규)

브라우저 `MediaRecorder` 산출물(webm/opus 등)은 그대로 Whisper에 넣을 수 없다. 표준 파이프라인:

1. **수신/검증**: MIME·크기 검증, `data/recordings/<sessionId>/<recordingId>.<ext>` 저장.
2. **정규화**: `ffmpeg -i in -ar 16000 -ac 1 -c:a pcm_s16le out.wav` (16kHz mono WAV).
3. **무음/길이 검출**: 앞뒤 무음 트림, 총 길이·발화 구간 추출(시간 배분 분석 기반).
4. **STT**: Whisper.cpp로 word-level timestamp 포함 전사.
5. **분석 엔진** (`lib/analysis/`):
   - **WPM**: `(단어 수 / 발화 시간[분])`. 무음 제외 옵션. 슬라이드 구간별 WPM도 산출 → 빠른 구간 하이라이트.
   - **필러워드**: 언어별 사전(`um, uh, like, you know …` / 한국어 `음, 어, 그…`) 매칭 + timestamp 수집.
   - **발음 정확도**: Whisper confidence score + 음소 정렬 휴리스틱으로 의심 단어 추출. L1 Profile 규칙과 교차 → `l1Related` 플래그. (정교한 wav2vec2 발음평가는 Phase 2 옵션, 인터페이스는 미리 분리)
   - **시간 배분**: 슬라이드 전환 타임스탬프(SCR-04에서 기록) × 발화 구간 → 슬라이드별 소요 시간.

각 분석 함수는 **순수 함수**로 작성하고 Whisper 출력 fixture로 단위 테스트한다(실제 모델 없이 CI 통과).

---

## 8. AI 어댑터 / 모델 셋업 자동화 (신규)

- 어댑터 규약·팩토리 패턴은 `CLAUDE.md` §3가 단일 진실원. 본 절은 **운영/셋업**만 다룬다.
- **모델 다운로드**: `pnpm setup:models` (`scripts/setup-models.ts`)가 Piper voice(`PIPER_VOICE_DIR`)와 Whisper ggml 모델(`WHISPER_MODEL_PATH`)을 받아 배치. 존재 시 스킵(idempotent).
- **프롬프트 관리**: 모든 LLM 프롬프트는 `lib/ai/prompts/`에 템플릿 파일로 분리·버전 관리. 코드에 인라인 금지 → 회귀 추적/AB 비교 용이.
- **폴백 보장**: Slide Critic·필러워드 등은 LLM 없이도 규칙 기반 1차 결과를 반환해야 한다(어댑터 부재 시 graceful degrade).
- **엔진 표시**: 현재 동작 엔진(로컬/클라우드)을 UI에 명시(예: "로컬 모델 사용 중 — 설정에서 API 키 입력 시 품질 향상").

---

## 9. 테스트 전략 (신규)

| 레벨 | 도구 | 대상 |
|------|------|------|
| 단위 | Vitest | 분석 함수(WPM/필러/발음), 어댑터 순수 로직, Zod 스키마, L1 규칙 매칭 |
| 통합 | Vitest | API 핸들러 ↔ Job ↔ DB(인메모리 SQLite), 파서(pptx/pdf fixture) |
| E2E | Playwright | 전체 루프 1회 완주(업로드→데모→편집→녹음→리포트→개선→Q&A), 모델은 **stub 어댑터**로 대체 |
| 픽스처 | `test/fixtures/` | 예제 슬라이드, Whisper 출력 JSON, 오디오 샘플 |

원칙: 외부 모델(LLM/TTS/STT) 호출은 어댑터 인터페이스 뒤에 있으므로 테스트에서 **stub 구현**으로 교체. CI는 실제 모델 없이 통과해야 한다.

---

## 10. 보안 (신규, 셀프호스팅 기준)

- **업로드 검증**: 확장자 화이트리스트(`ALLOWED_UPLOAD_EXT`) + 매직바이트 확인 + 크기 제한(`MAX_UPLOAD_MB`).
- **Path traversal 방지**: 모든 파일 경로는 `lib/storage/`의 경로 빌더 경유, `DATA_DIR` 하위로 정규화·검증. 사용자 입력을 경로에 직접 연결 금지.
- **LibreOffice/ffmpeg 호출**: 인자는 배열 spawn(셸 인터폴레이션 금지), 변환은 임시 디렉토리 + 타임아웃.
- **SSRF/명령 주입 주의**: `OLLAMA_HOST` 등 외부 URL은 검증. 프롬프트에 사용자 콘텐츠를 넣을 때 시스템 지시와 분리.
- **시크릿**: API 키는 `.env`만, 클라이언트 번들 노출 금지(`NEXT_PUBLIC_` 접두사 사용 안 함).
- 데이터는 전부 로컬 저장(프라이버시) — README에 명시.

---

## 11. 관측성 / 로깅 / 에러 처리 (신규)

- **pino** 구조화 로그: 요청 ID·job ID·세션 ID 상관키 포함. `LOG_LEVEL` 환경변수.
- **에러 경계**: React Error Boundary로 화면 단위 복구. API는 일관된 에러 형태(`{ code, message }`) 반환.
- **Job 가시성**: 실패 job은 `error` 저장 + 로그. (선택) `/api/jobs` 관리 뷰로 큐 상태 확인.
- 사용자 메시지와 내부 스택트레이스 분리(스택은 로그만).

---

## 12. UI 다국어화 (신규)

주 사용자가 한국인이므로 UI 카피는 i18n으로 분리한다. **발표 언어(콘텐츠)** 와 **UI 언어(인터페이스)** 는 별개 개념으로 다룬다.

- 경량 사전(`messages/ko.json`, `messages/en.json`) + 서버 컴포넌트 친화 i18n(예: `next-intl`). 기본 `ko`, 폴백 `en`.
- 문자열 하드코딩 금지. 새 화면 추가 시 키를 함께 등록.

---

## 13. 배포 / Docker / CI (신규)

- **Docker Compose**: `app`(Next.js) + `ollama` 서비스. Piper/Whisper 바이너리·기본 모델은 app 이미지에 포함하거나 첫 실행 시 `setup:models`로 받음.
- **한 줄 실행**: `docker compose up` → 브라우저 접속 가능해야 한다(Phase 0 완료 조건).
- **네이티브 설치 경로**도 README에 병기(Ollama/Piper/Whisper.cpp 각 설치 링크).
- **CI (GitHub Actions)**: `pnpm install` → `biome check` → `tsc --noEmit` → `vitest run` → `next build`. E2E(Playwright)는 stub 어댑터로 별도 job.

---

## 14. 개발 로드맵

### Phase 0 — 프로젝트 셋업
- [ ] Next.js + Tailwind + pnpm 초기화, Biome/Vitest/Playwright 설정
- [ ] Drizzle 스키마(§4) + 초기 마이그레이션
- [ ] `lib/ai/types.ts` 어댑터 인터페이스 + `factory.ts` 골격 + **stub 어댑터**
- [ ] Job Queue/Worker 골격 + `GET /api/jobs/:id/stream`(SSE)
- [ ] `lib/storage/` 경로 빌더(검증 포함), `DATA_DIR` 구성
- [ ] `scripts/setup-models.ts`, `.env.example`(완료), pino 로깅
- [ ] Docker Compose(app+ollama) + GitHub Actions CI
- **완료 조건**: `docker compose up` 또는 네이티브 절차로 빈 화면이 뜨고 CI가 초록.

### Phase 1 — MVP (Epic 0,1,2,3,6,7)
- [ ] SCR-01: 업로드 + PPTX/PDF 파싱 + 모국어 선택
- [ ] SCR-01b: Slide Critic(규칙 1차 + LLM 자연어 피드백, LLM 없이도 동작)
- [ ] SCR-02: AI 데모(Script Gen + TTS, 슬라이드 동기화 재생)
- [ ] SCR-03: 스크립트 편집기(데모 참조 토글, 예상 시간)
- [ ] SCR-04: 녹음(MediaRecorder, 슬라이드 전환 타임스탬프 기록)
- [ ] 오디오 파이프라인(ffmpeg 정규화) + STT + 분석(WPM/필러/발음/시간배분) + L1 매칭
- [ ] SCR-05: 리포트 UI
- [ ] SCR-06: 개선 스크립트(diff 비교, L1 표현 교정)
- [ ] SCR-08: Q&A 생성 + 답변 녹음/분석
- [ ] L1 언어팩 `ko.json` (종성·강세 / 관사·전치사)
- [ ] E2E: 전체 루프 1회 완주(stub 어댑터)
- **완료 조건**: 로컬 모델(Ollama+Piper+Whisper.cpp)만으로 업로드→…→Q&A 전체 루프 완주.

### Phase 2 — 확장 (Epic 4,5)
- [ ] SCR-07: 다국어 번역 + TTS + SRT
- [ ] 회차별 추이 그래프(Progress Tracking)
- [ ] wav2vec2 기반 발음 평가 옵션
- [ ] 클라우드 어댑터(Claude/ElevenLabs/Azure) + 설정 UI
- [ ] L1 언어팩 추가(일본어/중국어, 커뮤니티 기여)
- [ ] (필요 시) 워커 프로세스 분리, PostgreSQL 선택 백엔드

### Phase 3 — 고도화
- [ ] 영상 기반 분석(시선/제스처, pose estimation)
- [ ] 커뮤니티 템플릿/공유
- [ ] 시간 제약별 스크립트 자동 압축/확장 + 슬라이드 스킵 우선순위

---

## 15. 비목표 (MVP)
- 실시간 라이브 발표 대체/진행
- 멀티유저 인증/권한(1인 셀프호스팅 기준; Phase 2 이후 선택)
- 모바일 네이티브 앱
