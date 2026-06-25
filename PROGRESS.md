# PROGRESS — iamspeaker 개발 기록 (Catch-up Log)

> **목적**: 작업이 중단돼도 이 문서 하나로 현재 상태·결정·다음 할 일을 파악한다.
> **갱신 규칙**: 의미 있는 변화마다 §0 표 / §1 상태 / §4 다음 할 일 / §5 로그를 갱신. 새 세션은 §0 → §1 → §4 순으로 읽는다. (세부 이력은 git log / 커밋 메시지)

---

## 0. 한눈에 보기 (Resume Here)

| 항목 | 값 |
|------|-----|
| 프로젝트 | iamspeaker — 오픈소스 발표 연습 웹앱 (로컬 모델 우선) |
| 위치 | `/Users/seunghpark/Downloads/iamspeaker` (git main) · GitHub **spark798/iamspeaker (private)**, **CI 그린** |
| 현재 단계 | **🎉 v0.2.2 출시** — Phase 1·2 완료 + 실사용/a11y/반응형 품질 패스, 부채 0 |
| 제품 방향 | **"매일 함께 훈련하는 코치"**(vs 범용 AI=일회성 선생님). 해자=연습 이력 축적. 우선순위: ①반복 루프 동기부여(진행 중→일부 완료) → ③실시간 오디오 코칭. ②발표 지표는 이미 강함(GOP 자동 승격 보류). |
| 다음 액션 | Pillar ① 심화(목표 커스터마이즈·회차 나란히 비교) 또는 **Pillar ③ 실시간 오디오 코칭**(연습 중 라이브 WPM/속도/필러, Web Audio+Web Speech). 품질 Q1·Q2·하드닝·PDF·발음 점수/음소분해는 완료. |
| 최근 갱신 | 2026-06-24 |
| 셸 준비 | `export PATH="$HOME/.local/bin:$PATH"; . "$HOME/.nvm/nvm.sh"; nvm use default` (비대화형 셸 필수) |
| 로컬 도구 | Node 22(nvm)·pnpm 11(corepack) / ffmpeg 6·whisper-cli·cmake·gh → `~/.local/bin` / Ollama `hermes3:8b` / piper 보류 |
| 스택 | Next 15·React 19·TS 5.9 strict·Tailwind 4·Biome·Vitest+Playwright·Drizzle+better-sqlite3·next-intl·pino·zod |
| 테스트 | 225 통과 (+8 live-gated skip) + Playwright E2E. CI(lint/typecheck/test/build/E2E) 그린 |
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
- **2026-06-25** — **제품 방향 재정의 + 반복 루프 동기부여(Pillar ①)**. **방향**: 범용 AI = "한 번 봐주는 선생님", iamspeaker = "매일 함께 훈련하는 코치". 해자 = 내 연습 이력이 시간축으로 축적(챗 AI는 구조적 불가). 4기둥 채점 — ①반복 루프/트래킹=반쯤(데이터·추이 있음, 동기부여 없음) ②발표 특화 지표=가장 강함 ③실시간 코칭=거의 없음(전부 사후) ④워크플로우=구축됨. **결정**: GOP 자동 승격 보류(가장 강한 ② polish라 한계효용 낮음) → ①(싸고 해자 직결) 먼저 → 이후 ③(오디오 실시간, 브라우저 Web Audio+Web Speech, 큰 wedge). **구현(①)**: `lib/analysis/progress.ts summarizeProgress`(첫→최신 개선·베스트 테이크[recordingId 링크]·목표 달성[기준선 WPM구간+필러상한, 비원어민 보정]·연속 연습 스트릭) + progress 라우트가 장르→목표 산출·요약 반환 + ProgressView 요약 카드(🔥스트릭·개선 화살표·목표·베스트 링크, i18n 8키 5로케일). 순수 +7·렌더 테스트. CI 그린, 225 단위테스트, build OK. **다음 후보**: ① 심화(목표 커스터마이즈·회차 나란히 비교) 또는 ③ 실시간 오디오 코칭.
- **2026-06-25** — **음소별 색 분해(ELSA형, Lane 2)**: 발음 리포트를 단어 점수→음소 단위로 심화. gop.py가 강제정렬·decode-compare로 이미 음소별 status를 계산하므로 출력만 확장(`phones:[{ph,ok}]`). domain `PhonemeScore`+`PronunciationIssue.phonemes?`(wav2vec2 경로만), wav2vec2 GopSchema/gopWordsToIssues 통과, report-view에 음소 칩(초록=정확/빨강=교정)+범례, i18n pronPhonemeLegend 5로케일. **라이브 GOP 검증**(say→ffmpeg→gop.py): "our" 오발음 phones ok:false·"solution" 전부 ok:true 실출력 확인. 부수 발견·수정: gop.py argparse 기본 모델명이 존재하지 않던 `...-espeak-cer`(프로덕션은 어댑터가 --model 전달해 무해, 직접 실행 시 깨지던 잠복 버그) → `...-cv-ft`. 단위 +1·렌더 테스트(칩·범례). CI 그린, 217 단위테스트, build OK. 남은 Lane 2: 억양/강세·GOP 자동 승격.
- **2026-06-25** — **발음 평가 상용 파리티(Lane 2 준비)**: GOP 기본 승격 전 자체 평가(vs ELSA/Speeko) — 엔진·L1 맞춤은 경쟁력이나 상용 헤드라인인 **발음 점수(0-100)·단어별 심각도 부재**가 핵심 갭으로 진단 → 보강. `PronunciationScorerAdapter.detect`를 `PronunciationResult{issues, score}`로 확장(wav2vec2=모든 GOP 단어 평균 정확도, 휴리스틱=STT confidence 대용). `pronunciationScore()` 순수 헬퍼. `analysis_results.pronunciation_score`(마이그 0007), analyze 핸들러 산출·저장(실패 시 STT 대용). report-view에 발음 점수 헤드라인(NN/100)+이슈별 정확도 %(이진→심각도). i18n pronScoreHint 5로케일. stub/eval-audio/eval-pronunciation 시그니처 정합. 단위 +4·렌더 테스트(82 표시)·어댑터 갱신. **남은 갭(미룸)**: 음소별 색 분해(gop.py 음소 status 출력 확장)·억양/강세(무거움)·GOP 자동 승격(런타임 감지+폴백). CI 그린, 215 단위테스트, build·E2E OK.
- **2026-06-25** — **리포트 PDF export (Q3)**: 경쟁 제품 대비 갭(깔끔한 리포트/내보내기) 해소. **print 기반**(의존성 0, 셀프호스트 친화 — puppeteer/headless 불필요). report-view에 "PDF로 내보내기" 버튼(window.print) + Tailwind `print:` variant로 chrome 숨김(루트 로케일스위처·세션 헤더·Stepper·리포트 액션행 print:hidden) + globals.css `@media print`(print-color-adjust:exact·@page 여백·흑백 본문) + 인쇄 전용 브랜드 헤더(hidden print:block) + i18n exportPdf 5로케일. 렌더 테스트(fetch·window.print 모킹)로 버튼→print 호출 검증, 빌드 CSS에 `print:hidden{display:none}`·print-color-adjust 생성 확인. README 기능줄에 PDF·UI 5개 언어 정정. **Q3 중 SaaS 비종속 항목 선택**(인증/Postgres/GPU는 셀프호스트 원칙 트레이드오프로 보류). CI 그린, 211 단위테스트, build OK.
- **2026-06-24** — **품질 Q1-3·Q1-4 코퍼스 실측 하니스**(외부 코퍼스 게이트). 둘 다 코퍼스가 대용량·라이선스/모델 제약이라 CI/번들 측정 불가 → **재현 가능한 게이트 도구**로 제공(로컬 1커맨드, 숫자만 산출, 수치 날조 안 함). ①**Q1-3 TED 기준선**: `lib/eval/ted-baseline.ts`(순수: STM 파싱→talk별 WPM[말하기속도/벽시계]→분위수→p25~p75=ideal 제안) + `scripts/ted-baseline.ts`(`pnpm baseline:ted`, TEDLIUM_DIR 게이트). 합성 STM로 I/O 경로 실행 확인(TalkA 150·TalkB 180wpm, 주석/ignore 제외). talk.json source에 실측 절차 명시(미실행 시 문헌 시드 유지). TED-LIUM=CC BY-NC-ND 3.0, 원문 미저장. ②**Q1-4 발음 절대정확도**: `lib/eval/pronunciation.ts`(순수: speechocean762 scores.json 파싱·pearson/spearman·gold 오발음 라벨) + `scripts/eval-pronunciation.ts`(`pnpm eval:pronunciation`, SPEECHOCEAN762_DIR 게이트). **단어 단위** 비교로 IPA↔ARPAbet 음소 정렬 회피 — 검출 PRF + 발화 Spearman(우리 1−이슈율 vs 전문가 accuracy). 단위 +16(ted 8 + pron 8). **Q1 구현 범위 완료** — 잔여는 외부 의존(모델 용량·사용자 코퍼스). CI 그린, 210 단위테스트, build OK.
- **2026-06-24** — **품질 Q1-5 기본 품질·온보딩(인앱)**: README엔 모델 권장표가 있으나 인앱엔 활성 모델명·소형모델 기대치 안내가 없던 갭(반복 기록) 해소. `lib/ai/model-info.ts`(parseModelSizeB: 콜론 뒤 크기만 봐 버전 숫자 오인 회피 / isSmallLocalModel: ollama+<14B). /api/health llm에 model·smallModel 추가(서버 판정). EngineStatus가 LLM 행에 모델명 병기(ollama · llama3.1:8b) + smallModel 시 품질 힌트(더 큰 모델 qwen2.5:14b/클라우드, 5로케일). cloud 배지 색은 raw engine 키로 유지. 단위 +6, prod curl로 health 확인(smallModel:true), build OK. CI 그린, 194 단위테스트. 잔여: 생성 품질 자체는 모델 크기 한계(인프라 정상).
- **2026-06-24** — **상용화 하드닝 패스**(Q2 직후 감사→보충): ①**업로드 메모리 DoS 방어** — upload/recordings/answer가 크기 검증 전에 arrayBuffer로 파일 전체를 메모리 적재하던 것을 `file.size` 선검사(413)로 차단(`assertSizeWithinLimit`). ②**HTTP 보안 헤더** — next.config headers()로 CSP(default-src 'self', 마이크 녹음·blob 오디오 허용, Next 부트스트랩 'unsafe-inline', React Refresh eval은 dev만)·X-Frame-Options DENY·X-Content-Type-Options·Referrer-Policy·Permissions-Policy(microphone=self)·X-DNS-Prefetch. E2E(CSP 하 하이드레이션) 통과 + prod curl로 헤더 방출·prod에 unsafe-eval 없음 확인. ③**postcss `>=8.5.10` override**(GHSA-qx2v-qp2m-jg93) → `pnpm audit --prod` 0건. 감사 확인 양호: `.env` 미추적·라이선스/거버넌스·env fail-fast·5xx 비노출·헬스체크. 보류(낮음): graceful SIGTERM(부팅 recoverStalled로 커버)·reqId 상관로깅. CI 그린, 188 단위테스트, build·E2E OK.
- **2026-06-24** — **품질 Q2 신뢰성 완료**(4슬라이스, 각 1커밋). ①오디오 magic-byte 검증(Q2-7a): 녹음/데모 오디오가 그동안 확장자만 검사·MAGIC 무항목으로 위장 통과하던 것 차단(wav RIFF/WAVE·webm EBML·ogg/opus OggS·m4a/mp4 ftyp·mp3 ID3/sync·aac ADTS/ftyp). ②잡 재시도+지수백오프·dead-letter·완료 TTL(Q2-6): jobs.attempt/maxAttempts/nextRunAt(마이그 0006). fail()이 시도 여력 시 base×2^(n-1) 백오프로 queued 재큐, 소진 시 terminal failed(dead-letter). **별도 dead 상태 미도입** — 다수 컴포넌트가 succeeded/failed만 폴링하므로 재시도 중 queued로 되돌려 투명. claimNext가 nextRunAt 게이팅. Worker가 완료 잡 TTL 정리(JOB_TTL_HOURS, 실패는 점검 위해 보존). 기본 maxAttempts=1로 두어 기존 단일시도 테스트 호환, 앱만 config 주입. ③레이트리밋(Q2-7b): `lib/ratelimit.ts` 인프로세스 고정창(라우트·IP별, 429+Retry-After, now 주입 테스트), enqueue POST 8개 적용, E2E는 병렬·재시도 충돌 방지로 RATE_LIMIT_ENABLED=false. ④상태코드별 현지화 에러(Q2-8): 서버 한국어 메시지가 멀티로케일 클라이언트에 노출되던 갭을 errorKeyForStatus(429→tooManyRequests/413→tooLarge)+5로케일로 해소, 7개 컴포넌트가 res.status 우선 매핑. config: JOB_MAX_ATTEMPTS(3)/RETRY_BASE_MS(1000)/TTL_HOURS(24), RATE_LIMIT_ENABLED/MAX(30)/WINDOW_SEC(60). **CI 그린, 195 단위테스트(+26), build OK.** 잔여: Q2는 인프로세스 한정(멀티워커 확장은 Q3 Redis). Q1-3(TED 기준선 실측)·Q1-4 잔여(speechocean762)는 외부 코퍼스 대기.
- **2026-06-23** — 품질 Q1-4 발음 GOP 정밀화: 오디오 eval로 측정 — 강제정렬 GOP가 치환(think→sink)에서 cascade로 오발음 통과·이웃(it=0.09) 오검출 발견. **decode-compare**(자유 greedy CTC + 참조 음소 NW 정렬, 모델=espeak 음소라 가능)로 위치 특정 전환. WAV2VEC2_GOP_THRESHOLD env화. 측정: precision 50→100%(cascade FP 제거), recall 50%, F1 50→67%. 잔여 한계: 반복음소 미세치환은 time-anchor/실 L2 코퍼스(speechocean762) 필요. CI 그린, 159 단위테스트.
- **2026-06-23** — 베트남어(vi) 제거(타겟 아님): vi L1팩 + UI 로케일 전체 삭제. **L1팩 ko/ja/zh/es, UI 로케일 ko/en/ja/zh/es.** nativeVi 키·테스트 it.each 정리. CI 그린, 159 단위테스트.
- **2026-06-23** — 품질 Q1-6 오디오 eval: 하니스를 WPM·발음까지 확장. `lib/eval/audio.ts`(wpmAccuracy MAE/MAPE/tolerance) + `scripts/eval-audio.ts`(`pnpm eval:audio`, 모델 게이트): piper합성→whisper STT→WPM 비교, wav2vec2 GOP 발음 PRF. 라이브: WPM MAE 0(STT 정확), 발음 clean 0플래그·gross 검출 F1 100%(합성 plumbing 검증). 단위 wpmAccuracy 3종. CI 그린, 162 단위테스트. 정확도 하니스 = 필러(CI) + WPM·발음(게이트) 완비.
- **2026-06-23** — 품질 Q1-6 정답셋 확장: 필러 정답셋 6→14샘플(precision 함정 like=동사·반복강조·clean·ko). 확장 직후 F1 95.7%(FP=like동사 2)→ **like-동사 맥락 규칙** + 강조 오라벨 수정 → precision/recall/F1 100%(하드셋, 일반 규칙). F1 게이트 0.4→0.9. fillerPositions 단위테스트. 남은: WPM·발음 오디오 eval. CI 그린, 159 단위테스트.
- **2026-06-23** — 상용화 품질 플랜 착수(셀프호스트 OSS 트랙). `docs/quality-plan.md`(감사+Q1~Q3). **Q1-1 정확도 eval 하니스**(`pnpm eval:accuracy`, prf, fillers 정답셋) + **Q1-2 필러 고도화**(fillerPositions: 다어절·반복·사전확장). 측정: 필러 F1 78.8%→100%(소규모셋, 일반화 위해 데이터 확장=Q1-6). 남은 Q1: 기준선 실측·발음 임계보정·기본품질·정답셋 확장. CI 그린, 154 단위테스트.
- **2026-06-23** — wav2vec2 GOP 발음 평가(정밀, 옵션): PronunciationScorerAdapter 추상화(휴리스틱 기본·의존성0 / wav2vec2 env 게이트). `scripts/pronunciation/gop.py` — espeak G2P(espeakng_loader, pip-only)→wav2vec2 음소 CTC→torchaudio forced_align→**정규화 GOP**(exp(mean(logP(ref)−max_q logP(q)))). 대본 참조라 STT 타임스탬프 비의존. matchL1RuleByPhoneme로 IPA 오발음을 L1 규칙과 음소 매칭. analyze 핸들러가 스코어러 사용(실패시 휴리스틱 폴백). **라이브 검증(M2 Pro): 정상 conf≈1.0(FP 0), 오발음(cat/weather) conf 0.0.** 단위 10종. 모델 facebook/wav2vec2-lv-60-espeak-cv-ft. CI 그린, 150 단위테스트.
- **2026-06-23** — 앱 UI 로케일 es/vi 추가: messages/{es,vi}.json 전체 완역 + request SUPPORTED_LOCALES + locale-switcher. **이제 UI 6종(ko/en/ja/zh/es/vi) = L1팩 5종 + en**. i18n 키 일치 가드 6로케일. CI 그린, 140 단위테스트, build OK.
- **2026-06-23** — es/vi L1 언어팩(Epic6): `lib/ai/l1-profiles/{es,vi}.json`(발음7+표현5, 설명=화자 모국어+영어 예시) + 로더 등록 + upload-form 셀렉트 + i18n 4로케일. 이제 L1팩 5종(ko/ja/zh/es/vi). l1 테스트 it.each 확장. 실측(hermes improve): es·vi 관사·복수·3인칭-s 교정 정상. 비원어민 WPM 보정 자동. CI 그린.
- **2026-06-22** — **Docker 전체 루프 라이브 검증 완료**(Lane 1b): colima(vz, sudo·brew 없이 ~/.local 바이너리 설치)로 `docker compose up --build`. 빌드 중 3건 수정 — whisper 스테이지 ca-certificates(git HTTPS), `-DGGML_NATIVE=OFF`(VM fp16 NEON 오류), `-DBUILD_SHARED_LIBS=OFF`(libwhisper.so 의존 제거→단일 바이너리). **API로 전체 루프 실측 전부 통과**: health(llm reachable) · 데모 생성(ollama) · 데모음성(piper WAV) · 녹음→analyze(whisper STT 140wpm, ffmpeg pause, 발음/필러) · 리포트 B-001 점수(pitch×ko 보정으로 140wpm=ideal) · 개선(ScriptDiff+L1) · Q&A 생성(투자자 질문) · en→ko 번역 SRT · 추이 · 모델 자동 부트스트랩(ollama-pull+setup:models). README "미검증" 제거. CI 그린. 남은 Lane 1b: 스크린샷·체감품질(브라우저 필요, 사람).
- **2026-06-22** — Docker 배포 검증·보강(Lane 1b 일부): **정적 점검으로 STT/TTS 미설치 발견** — 기존 이미지는 ffmpeg/libreoffice만 있어 whisper/piper 부재로 녹음분석·데모음성 깨짐. 수정: Dockerfile에 whisper.cpp 빌드 스테이지+piper(pip)+libgomp1, entrypoint가 setup:models로 모델 부트스트랩, compose에 ollama-pull(기본 모델 자동), README 정확화. better-sqlite3 빌드는 pnpm-workspace.yaml allowBuilds로 이미 승인됨(오해 해소). **⚠️ 이 개발환경 docker 데몬 없음 → 라이브 `docker compose up --build` 미검증(표준 레시피 기반). 실 1회 빌드 검증 필요.** CI 그린.
- **2026-06-22** — OSS 채택 패키징(Lane 1a): package.json 메타(license MIT·repo·version 0.2.2), README stale 상태문구 정정+배지+기능요약+스크린샷 자리, CONTRIBUTING/SECURITY/CODE_OF_CONDUCT, .github 이슈·PR 템플릿. 남은 Lane 1b: 도그푸드 실사용 1회(실슬라이드+녹음, 체감 품질) + Docker 배포 실검증 + 스크린샷 실제 추가. CI 그린.
- **2026-06-22** — **v0.2.2 태그/릴리스** (실사용 품질·a11y·반응형 패스 묶음).
- **2026-06-22** — a11y/반응형 전용 패스: 에러 문단 role="alert"(10컴포넌트), 라이브 상태 aria-live(recorder/answer-recorder), 장식 글리프 aria-hidden, engine-status 경고 role. 반응형: upload-form 그리드 모바일 스택, progress 테이블 overflow-x, demo/recorder 헤더 flex-wrap. (기존 stepper nav·aria-current·차트 role·페이지 h1 확인). DEVELOPMENT §14 a11y/반응형 [x]. CI 그린, 134 단위테스트. 남은 갭: 8b 기대치 UI 안내, progress 대기회차 리포트 404 엣지, 정밀 색대비 감사.
- **2026-06-22** — 실사용 품질 보강 2차: ①첫 실행 친화도 — health에 llm.reachable(로컬 ollama 핑/클라우드 키 판정), EngineStatus에 미도달 안내 배너(Ollama 실행/`.env` 키). ②긴 LLM 대기 피드백 — common.slowHint를 qa/improve busy에 표시. 1차(녹음 타이머·데모 음성 오류 안내·Q&A 카테고리 i18n)에 이어짐. 남은 갭: 8b 기대치 UI 안내, progress 대기회차 리포트 404 엣지, a11y 정식 패스/모바일 반응형. CI 그린, 134 단위테스트.
- **2026-06-22** — **v0.2.1 태그/릴리스** (다국어 완결 + 클라우드 LLM + 회차 추이 + SRT). v0.2.0 이후 Phase 2 마무리분 묶음.
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
