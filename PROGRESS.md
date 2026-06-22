# PROGRESS — iamspeaker 개발 기록 (Catch-up Log)

> **목적**: 작업이 중단돼도 이 문서 하나로 현재 상태·결정·다음 할 일을 파악한다.
> **갱신 규칙**: 의미 있는 변화마다 §0 표 / §1 상태 / §4 다음 할 일 / §5 로그를 갱신. 새 세션은 §0 → §1 → §4 순으로 읽는다. (세부 이력은 git log / 커밋 메시지)

---

## 0. 한눈에 보기 (Resume Here)

| 항목 | 값 |
|------|-----|
| 프로젝트 | iamspeaker — 오픈소스 발표 연습 웹앱 (로컬 모델 우선) |
| 위치 | `/Users/seunghpark/Downloads/iamspeaker` (git main) · GitHub **spark798/iamspeaker (private)**, **CI 그린** |
| 현재 단계 | **🎉 v0.2.0 출시** — Phase 1(9화면) + Phase 2(B-001 품질 기준선·TTS·다국어) 완료, 부채 0 |
| 다음 액션 | 후보(택1): ①es/vi L1팩+UI로케일 ②SRT export ③Phase3 영상/제스처 ④클라우드 LLM 실 키 live 검증. 하우스키핑: DEVELOPMENT.md §14 로드맵 체크박스 stale → 현실 반영. — 회차추이·클라우드어댑터 ✅완료 |
| 최근 갱신 | 2026-06-21 |
| 셸 준비 | `export PATH="$HOME/.local/bin:$PATH"; . "$HOME/.nvm/nvm.sh"; nvm use default` (비대화형 셸 필수) |
| 로컬 도구 | Node 22(nvm)·pnpm 11(corepack) / ffmpeg 6·whisper-cli·cmake·gh → `~/.local/bin` / Ollama `hermes3:8b` / piper 보류 |
| 스택 | Next 15·React 19·TS 5.9 strict·Tailwind 4·Biome·Vitest+Playwright·Drizzle+better-sqlite3·next-intl·pino·zod |
| 테스트 | 62 통과 (+5 live-gated skip) + Playwright E2E. CI(lint/typecheck/test/build/E2E) 그린 |
| 문서 순서 | `PROGRESS.md` → `CLAUDE.md`(규칙) → `DEVELOPMENT.md`(계획) → `docs/storyboard.md` · 자동화: `docs/automation.md` |
| 자동화 | 감독되는 자동화 3종: Driver(정지선 게이트키퍼)·Benchmarker(`docs/benchmark.md` 제안)·Reviewer. 규칙=`docs/automation.md` |

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
| 오디오 정규화(`lib/audio`) + **WhisperCpp STT** + **분석 엔진**(WPM/필러/시간배분, `lib/analysis/speech`) | ✅ |
| **`analyze` 잡** + **SCR-04 녹음**(MediaRecorder+전환) + **SCR-05 리포트** | ✅ (say 음성으로 분석 전 구간 검증) |
| **SCR-06 개선**(improve 잡 → diff 부분/전체 적용 → 새 버전) | ✅ (실 LLM 개선 검증) |
| **SCR-08 Q&A**: 질문 생성(08a) + **답변 녹음/평가**(08b: qa_evaluate → STT 분석 + LLM 적합도/개선답변) | ✅ (실 LLM 검증) |
| **SCR-07 진행 기록**(회차별 WPM/필러 추이) | ✅ (다국어 출력은 Phase 2) |
| **L1 프로필(ko.json)** — improve에 모국어 규칙 주입(Epic 6) | ✅ (실 LLM: 복수/수일치 교정 검증) |
| 발음분석(-ojf 토큰confidence + L1 음소교차) | ✅ |
| TTS(PiperTts + 데모 음성 재생, SCR-02) | ✅ |
| 다국어 출력 · 추가 언어팩(ja/zh) | ⏳ 대기 |
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

1. ✅ `lib/audio/`(normalizeToWav, readWavDurationSec) + WhisperCpp STT 어댑터(`lib/ai/whispercpp`, parse+spawn). 모델 `data/models/whisper/ggml-base.en.bin` 다운로드. 실 음성(say→ffmpeg→whisper) 전사 검증.
2. ✅ **분석 엔진** (`lib/analysis/speech.ts`) — computeWpm / detectFillerWords(en·ko 사전) / computeSlideTimeBreakdown / analyzeSpeech. 순수 + 단위 6. WPM 분모는 readWavDurationSec.
3. ✅ `analyze` 잡 + recordings 라우트(멀티파트) + SCR-04 녹음(MediaRecorder+전환 타임스탬프) + SCR-05 리포트(WPM/필러/시간배분) + 마이그레이션 0001(recordings.transitions). say 음성으로 전 구간 검증.
4. ✅ **SCR-06 개선**: improve 잡(스크립트+분석→diff) + `/api/recordings/[id]/improve`·`/api/recordings/[id]` + ImproveView(부분/전체 적용→새 버전). 실 LLM 검증. (L1 프로필 ko.json은 추후)
5. ✅ **SCR-08a Q&A 질문**: `POST /api/sessions/[id]/qa/generate` + `GET .../qa` + QaView(생성→난이도 배지/카테고리/관련 슬라이드). improve→qa 링크.
6. ✅ **SCR-08b Q&A 답변 평가**: qa_evaluate 잡(답변→STT→analyzeSpeech+evaluateAnswer→qa_answers) + `POST/GET /api/qa/[itemId]/answer` + AnswerRecorder(질문별 녹음→평가 표시). 실 LLM 검증(relevanceScore+개선답변).
7. ✅ **SCR-07 진행 기록**: `GET /api/sessions/[id]/progress`(회차별 wpm/필러/길이) + ProgressView(표/막대). qa→progress 링크. 다국어 출력(번역·TTS·SRT)은 Phase 2.
8. ✅ **L1 프로필 ko.json** + 로더(`lib/ai/l1-profiles`) → improve 프롬프트에 모국어 표현 규칙 주입(Epic 6). 실 LLM 검증.
9. 마감: 발음분석(-ojf 토큰확률 + L1 발음규칙) · TTS(piper 대안: 소스빌드/say/Docker) · 다국어 출력 · ja/zh 언어팩 · CI actions @v4→최신.

---

## 5. 세션 로그 (요약, 최신 우선)
- **2026-06-22** — SRT 자막 export(SCR-07 완결): `lib/subtitle/srt.ts`(formatTimestamp+buildSrt, 발화 추정시간 순차 큐, 원문+번역 2줄) + `lib/translation.ts loadScriptWithTranslation` 공용 헬퍼(번역 라우트·SRT 라우트 중복 제거) + route `GET /api/sessions/[id]/subtitle`(병기 SRT 다운로드) + demo-view 링크 + i18n. srt 단위 6종 + E2E SRT 검증. DEVELOPMENT §14 SCR-07 [x]. CI 그린, 134 단위테스트.
- **2026-06-22** — 클라우드 LLM 어댑터(Claude/OpenAI) + 엔진 상태 UI: `lib/ai/llm/`(client: claudeChatJson·openaiChatJson·extractJson 관대파싱 / adapters: provider-무관 Llm* — 프롬프트·Zod·정렬 공유, 호출만 주입 ChatJson). ollama/index는 Ollama*를 Llm*+ollamaChatJson 서브클래스로(임포트 보존). factory가 engines.script로 provider 선택 → **deriveEngines 보고 불일치(리뷰 미결) 해소**. config OPENAI_MODEL 추가. EngineStatus(홈, 활성 엔진+로컬/클라우드 배지, CLAUDE §2 충족). extractJson 단위 5종, ollama live 7종 통과(리팩터 무결성, hermes3:8b 43s), build/E2E 그린. 키는 .env로만(UI 입력 X). 클라우드 live는 실 키 필요 → 미검증(구조·extractJson 검증됨). CI 그린, 128 단위테스트.
- **2026-06-21** — 회차별 추이 그래프(SCR-07): progress 화면에 의존성 없는 인라인 SVG 라인 차트(`components/trend-chart.tsx`) 추가 — WPM 추이(권장 110–150 음영)+필러 추이(분석 2회+부터), 첫→마지막 증감 표기, 단일점/빈값 처리. 기존 회차 테이블 유지. 저장된 분석 데이터만 사용(모델 의존 0). i18n 4로케일, 렌더 테스트 5종. CI 그린, 123 단위테스트.
- **2026-06-21** — 품질 향상 실측(qwen2.5:14b, M2 Pro 16GB): "8b 한계, 인프라 정상" 가설 **데이터로 확정**. 생성 분량 5분 피칭 62→105wpm(8b 대비 ~1.7배), 데모 67→91wpm; 10분 강연은 14b도 부족(390단어)→긴 발표 완전 수렴은 32B+/클라우드. 번역 8b 미번역/깨진숫자가 14b서 대부분 해소(잔여: 큰 수 단위 현지화 ko/zh 10배 오류·ja 정확). 코드 변경 없음, README 모델 권장표 추가(8b 기본/qwen2.5:14b 권장 16GB+/32B+·클라우드), benchmark.md에 실측 기록. 기본 OLLAMA_MODEL은 진입장벽 위해 8b 유지.
- **2026-06-21** — 알려진 마이너 2건 정리: ① script_translations unique(scriptId,language) 인덱스(마이그 0005) + route onConflictDoNothing(동시 토글 중복행 방지) ② 점수 band 라벨 방향중립화(느림/높음→기준 미만/초과, 4로케일) — 휴지/분 등에서 "low=적음"을 "느림"으로 오해하던 문제 해소. 백로그 비움. (주의: 로컬 biome를 `| tail`로 가려 첫 푸시가 포맷 실패 → 재포맷 커밋; 이후 exit code 확인.) CI 그린.
- **2026-06-21** — 앱 UI 로케일 ja/zh + 언어 전환기: messages/{ja,zh}.json 전체 완역, i18n/request.ts에 ja/zh + 쿠키 기반 로케일 선택(locale 쿠키→없으면 ko), LocaleSwitcher(셀렉트→쿠키+새로고침) layout 헤더. 키셋 일치/빈값 가드 테스트(4로케일). UI ja/zh 화자 일관성 갭 해소. CI 그린, 118 단위테스트, build OK.
- **2026-06-21** — Phase 2 전체 리뷰 + **v0.2.0 태그/릴리스**. 점검: any 0·dead code 0, 마이그레이션 0000~0004 fresh-clone 검증, 신규 어댑터(translator)·라우트(demo-audio/translation) 패턴 준수, biome/tsc/111테스트/eval 그린. **알려진 마이너(백로그)**: script_translations에 (scriptId,language) unique 인덱스 없음 → 동시 토글시 중복행 가능(단일 사용자엔 무해, .get() 첫행 반환). 향후 인덱스 추가. report-view pausePerMin band="low"(휴지 너무 적음) 라벨이 "느림"으로 표시되는 의미적 미스매치(경미).
- **2026-06-21** — 출력 번역 자막 병기(SCR-02, Phase 2 다국어): TranslatorAdapter(순서·길이 보존) + OllamaTranslator(인덱스 JSON)/StubTranslator + factory + Adapters 번들. translatePrompt + TranslationSchema. script_translations 캐시 테이블(마이그 0004). route `GET /api/sessions/[id]/translation`(타깃=nativeLanguage, 모국어=발표언어면 204, 캐시). demo-view "모국어 번역 병기" 토글→슬라이드별 원문 아래 번역 + i18n. 계약 테스트(stub+live). 실측: en→ko/ja/zh 순서·길이 보존, 품질은 8B 한계(큰 모델로 개선). CI 그린, 111 단위테스트.
- **2026-06-21** — ja/zh L1 언어팩(Epic6, Phase 2 시작): `lib/ai/l1-profiles/{ja,zh}.json`(표준 L1 간섭 패턴 발음7+표현5, 설명=화자 모국어+영어 예시) + 로더 등록 + upload-form nativeLanguage 셀렉트(ko/ja/zh/en)+i18n. l1-profiles 테스트 it.each(ko/ja/zh). 실측(hermes improve): ja·zh 모두 관사·복수·3인칭-s 교정 정상. 비원어민 WPM 보정은 자동(nativeLanguage!==language). CI 그린, 109 단위테스트. 남은 다국어: **출력 번역(자막/스크립트 번역)**은 별도 슬라이스.
- **2026-06-21** — 자가개선 루프(B-001 활용2): `lib/ai/refine.ts generateWithRefinement`(생성→scoreScriptQuality→분량 미달/초과면 lengthBias 재생성→더 나은 쪽 채택, overall 동률시 단어수 tie-break) + generateScriptPrompt에 목표 단어수 가이드(~150wpm×분, 시간만 주던 게 과소생성 원인) + GenOptions.lengthBias. demo 핸들러가 사용(genre 기준선). 단위 5종. 실측(hermes3:8b): 분량 186→312단어, 루프 179→194 채택. 잔여 갭은 8B 용량 한계(어댑터로 큰 모델 교체시 수렴). **B-001 활용1·2·3 전부 구현 완료.** CI 그린, 107 단위테스트.
- **2026-06-21** — 회귀 eval(B-001 활용3): `lib/eval/script-quality.ts`(scoreScriptQuality: coverage + estimatedWpm 기준선 적합도, percentile/estimate 재사용) + `scripts/eval.ts`(`pnpm eval`, stub 결정적/live 실모델) + Reviewer 훅(docs/automation.md). 하드 게이트=커버리지(green 베이스라인 유지), 페이싱은 품질 추이 정보. 단위 5종. **eval 실측 발견: 생성 스크립트가 목표 시간 대비 너무 짧음(live 26~55wpm 분량 vs 150 목표)** → 활용2(자가개선 루프) 교정 대상. CI 그린, 102 단위테스트.
- **2026-06-21** — pause/슬라이드밀도 점수화(SCR-05): B-001 활용1 4메트릭(WPM·filler·휴지·밀도) 완성. **실측으로 whisper `-ml 1` word timestamp의 gap 붕괴(5.62-5.62, 마지막 단어 30s) 확인 → pause를 ffmpeg silencedetect(오디오 직접, STT 독립)로 측정**. lib/audio countSilences+parseSilenceCount, analysis_results.pause_count(마이그 0003), report API에 덱 평균 단어수(밀도). 실측 1.5s 묵음→countSilences=1. CI 그린, 97 단위테스트.
- **2026-06-21** — 발표 장르 선택(SCR-01, B-001 장르 축 활성화): sessions.genre 컬럼(talk|pitch|lecture, 마이그레이션 0002) + 세션 생성 2경로 zod/insert + upload-form 셀렉트 + i18n. report API가 하드코딩 talk → session.genre로 기준선 선택(pitch=투자자 Q&A 주력). E2E pitch 회귀. CI 그린. 남은 후속: pause·슬라이드밀도 측정→점수화, B-001 활용2·3.
- **2026-06-21** — v0.1.0 태그/릴리스(Phase 1 핵심 루프 완성). B-001 채택 + 활용1(기준선 백분위 점수) 구현(SCR-05): `lib/analysis/baselines/{talk,pitch,lecture}.json`(메트릭 숫자만, 원문0) + Zod 로더 + `percentile.ts`(scoreRange/lowerBetter/upperLimit, WPM 비원어민 보정) + report API 조인(duration·원어민 판정)→scores 반환 + report-view 점수 섹션. 단위 13종. 장르 talk 기본(선택 UI 후속), pause·슬라이드밀도는 측정 추가 후. 활용2·3 대기. CI 그린. 94 단위테스트.
- **2026-06-21** — TTS 마감(SCR-02): 핵심 루프 마지막 구멍(데모 음성). TTS는 그동안 stub이고 소비처 없어 데모가 텍스트 전용이었음. PiperTts 어댑터(텍스트→stdin, 22kHz mono WAV) + factory 배선 + storage demoAudioPath(버전·슬라이드별 캐시) + route `GET /api/sessions/[id]/demo-audio?slide=N`(합성→디스크캐시→WAV 스트리밍) + demo-view 슬라이드별 `<audio>` 플레이어 + i18n. macOS는 pip piper(`pip install piper-tts`, .env PIPER_BIN 절대경로)로 실측: 어댑터 0.7s WAV, live 계약 통과. E2E에 demo-audio 200/audio/wav 검증 추가. 기존 인프라(config PIPER_*·setup:models·preflight)와 정합. CI 그린.
- **2026-06-21** — TED 벤치마크 B-001을 docs/benchmark.md + 메모리에 기록(Benchmarker 첫 과업, status: proposed). 3활용(백분위 점수·자기개선 루프·회귀 eval) + 제약(라이선스 CC BY-NC-ND 원문 재배포 금지 / 과적합 방지 장르별 기준선 분리). 코드 미반영(채택 대기).
- **2026-06-21** — Phase 1 전체 리뷰 + CI actions @v4→v5(Node20 경고 해소). 발견·수정: ① live 어댑터 계약 테스트가 5s 기본 타임아웃에 걸려 실행 불가 → per-it timeoutMs 주입(120s), hermes3:8b로 5종 전부 통과(2~9s) ② queue.complete/setProgress 경쟁 조건(타임아웃 failed 작업을 늦은 핸들러가 succeeded로 되살림) → WHERE status='running' 가드 ③ ollama/index 중간 import 정리. 미수정(기록): deriveEngines가 클라우드 키 있으면 "claude" 보고하나 factory는 ollama 폴백(Phase 2 구현 시 해소, /api/health에만 노출) / AnswerEvalSchema relevanceScore .max(1) — LLM이 0~100 반환 시 parse throw(프롬프트로 완화, live 통과). 강점: 어댑터패턴·path-traversal 방어·매직바이트 검증·전 경계 Zod·any 0·FK cascade·배열인자 spawn·env↔config 동기. biome/tsc/80 단위테스트 그린.
- **2026-06-21** — 발음 분석(SCR-05): whisper `-ojf`로 토큰 확률(p) 출력→단어별 confidence 평균(특수토큰 제외). `detectPronunciationIssues`(confidence<0.6 단어를 ko.json 발음규칙 f/v/z/th/r/l과 교차→l1Related+교정팁). analyze 잡이 nativeLanguage→L1 주입, report-view에 발음 교정 섹션+모국어 빈출 배지+i18n. 단위테스트 6종 추가. 실측: say→ffmpeg→whisper 토큰 p값 흐름 + "Our"→r/l·"software"→f 규칙 매칭 확인. CI 그린.

- **2026-06-20** — 감독되는 자동화 3종: `docs/automation.md`(거버닝 — Driver 정지선/단계카운터 N=3, Benchmarker 제안전용, Reviewer 규칙+벤치마크참고). `.claude/agents/iamspeaker-driver.md`(진행/정지 게이트키퍼, read-only) + `iamspeaker-benchmarker.md`(리서치→`docs/benchmark.md` 제안만) + reviewer에 벤치마크 참고 추가. `docs/benchmark.md` 시드. 완전 자율 아님 — 정지선이 안전장치.
- **2026-06-20** — L1 프로필(Epic 6): `lib/ai/l1-profiles/ko.json`(한국어 화자 발음/표현 규칙) + 로더(Zod 검증). improve 잡이 session.nativeLanguage→L1 로드, improveScriptPrompt가 표현 규칙을 주입. 실 LLM(hermes): nativeLanguage=ko로 복수 -s·주어동사 수일치 교정 검증.
- **2026-06-20** — SCR-07 진행 기록: `GET /api/sessions/[id]/progress`(녹음별 wpm/필러수/길이 시간순) + `components/progress-view.tsx`(표+WPM 막대, 회차→리포트 링크). qa→progress 링크. **스토리보드 9화면 전부 구현 완료.** 다국어 출력은 Phase 2.
- **2026-06-19** — SCR-08b Q&A 답변 평가: `qa_evaluate` 잡(답변→normalize→STT→analyzeSpeech(WPM/필러)+evaluateAnswer(적합도/개선답변)→qa_answers). `POST/GET /api/qa/[itemId]/answer`. `components/answer-recorder.tsx`(질문별 MediaRecorder→평가 표시). 실 LLM(hermes): 질문 생성→답변→relevanceScore 0.3+개선답변 검증. **Q&A 전 구간 완성.**
- **2026-06-18** — SCR-08a Q&A 질문: `POST /api/sessions/[id]/qa/generate` + `GET .../qa`(최신 qaSession 질문). `components/qa-view.tsx`(생성→SSE→난이도/카테고리/슬라이드 배지). improve→qa 링크. qa_generate 잡은 기존 + live 계약 검증됨.
- **2026-06-18** — SCR-06 개선: `improve` 잡(최신 스크립트 + 분석 → ScriptDiff, 잡 result에 담김) + `POST /api/recordings/[id]/improve` + `GET /api/recordings/[id]`. `components/improve-view.tsx`(원본/개선 diff, 체크박스 부분/전체 적용 → /scripts 새 버전). report→improve 링크. 실 LLM(hermes): 필러 많은 스크립트 → 개선본+이유 생성 검증.
- **2026-06-18** — SCR-04/05 + analyze 잡: `analyze` 핸들러(녹음→normalizeToWav→STT→analyzeSpeech→analysis_results). `POST /api/sessions/[id]/recordings`(멀티파트, 오디오 검증) + `GET /api/recordings/[id]/analysis`. `components/recorder.tsx`(MediaRecorder+슬라이드 전환) + `report-view.tsx`(WPM/필러/시간배분). 마이그레이션 0001(recordings.transitions; durationSec 기본값 변경이 테이블 재생성 유발하던 것 회피). say 음성으로 분석 전 구간 검증(WPM 146/필러 감지/시간배분). **전체 루프(업로드→데모→편집→녹음→리포트) 동작.**
- **2026-06-17** — 분석 엔진: `lib/analysis/speech.ts`(computeWpm/detectFillerWords[en·ko]/computeSlideTimeBreakdown/analyzeSpeech) + 도메인 `SlideTransition`. 순수 함수 + 단위 6. 전체 72 통과.
- **2026-06-17** — 오디오 STT: `lib/audio`(ffmpeg normalizeToWav + readWavDurationSec) + `lib/ai/whispercpp`(parse+WhisperCppStt), factory getStt 교체(stub 가드). ggml-base.en 다운로드. 실 음성(say→ffmpeg→whisper) 전사 검증. 단위 +4(파서/wav 길이). ⚠️ WPM은 readWavDurationSec 사용(transcript durationSec 부정확).
- **2026-06-17** — 리뷰#2 보완: API 라우트 8개 5xx 로깅 통일(`errorResponse`), SSE 라우트 try/catch, i18n 고아키(`upload.phaseNote`) 제거·`home.phase` 현행화. PROGRESS 정리.
- **2026-06-16** — 오디오 도구 설치(ffmpeg 6·whisper.cpp 빌드·cmake; piper 릴리스 깨져 보류). GitHub 연동(gh 설치·인증·private 레포·push). **CI 그린** — `data/` 디렉토리 미추적으로 인한 E2E 500 수정(`createDb` 부모 mkdir + `.gitignore data/*`). Playwright E2E 활성화(`USE_STUB_ADAPTERS`) + `next dev` 500 수정(instrumentation 제거→지연 기동, D15/D16).
- **2026-06-15** — SCR-01b 슬라이드 분석 + Slide Critic 규칙 폴백(리뷰#1).
- **2026-06-14** — 전체 리뷰#1 + 싼 수정(잡 타임아웃 등). Phase 1 화면: SCR-01 업로드 / SCR-02 데모 / SCR-03 편집기. 슬라이드 파서. UI i18n+seed. 실제 Ollama 어댑터 + 프롬프트 정합성. **M1 Walking Skeleton**. Phase 0-7~0-10(어댑터골격/JobQueue+SSE/UI셸/Docker·CI). 자동 마이그레이션(D14).
- **2026-06-13** — 기획·계획 재구성(CLAUDE/DEVELOPMENT/storyboard/.env), 로드맵 재검증, 리뷰 가드레일 에이전트, 기반 정비(MIT·git init). Phase 0-1~0-6(스캐폴딩/config/로깅·에러/도메인/DB/storage). 헤르메스 검증. 결정 D1~D12.
