# CLAUDE.md — iamspeaker AI 에이전트 작업 가이드

이 문서는 AI 코딩 에이전트(Claude Code 등)가 **iamspeaker**를 일관된 방향으로 개발하기 위한 **운영 규칙**이다. 작업 전 반드시 먼저 읽고, 모르는 결정은 추측하지 말고 본 가이드와 아래 문서 맵의 원칙을 따른다.

## 문서 맵
| 문서 | 역할 |
|------|------|
| [`PROGRESS.md`](PROGRESS.md) | **세션 시작 시 먼저 읽기** — 현재 상태·결정 로그·다음 할 일 (중단 시 catch-up) |
| `CLAUDE.md` (본 문서) | 에이전트 작업 규칙 · 핵심 설계 원칙 · 어댑터 규약 · 데이터 모델 · 작업 체크리스트 |
| [`docs/storyboard.md`](docs/storyboard.md) | 제품/화면 명세 (SCR-01~08), Epic 0~7 백로그 |
| [`DEVELOPMENT.md`](DEVELOPMENT.md) | 상세 엔지니어링 계획 (스택 결정·디렉토리·Job Queue·오디오 파이프라인·테스트·보안·로드맵) |
| `.env.example` | 환경변수 (필수/선택 구분) |

화면 ID(SCR-XX)·Epic 번호는 코드/이슈/PR에서 동일 참조: `feat(SCR-04): 녹음 컨트롤`, `feat(epic-7): Q&A 예상질문 생성`.

---

## 0. 프로젝트 한 줄 요약
**iamspeaker**는 슬라이드를 업로드하면 AI가 먼저 시범 발표(데모)를 생성하고, 사용자가 참고해 연습 녹음을 하면 속도·발음·필러워드를 분석해 피드백과 개선 스크립트를 제공하는 **오픈소스 발표 연습 웹앱**이다.

## 1. 핵심 원칙 (위반 금지)
- **오픈소스 / 셀프호스팅 우선** — 누구나 클론해서 바로 띄울 수 있어야 한다.
- **로컬/오픈소스 모델 우선** — STT/TTS/LLM/발음 분석은 기본 로컬 동작. 클라우드 API는 *선택적 업그레이드*.
- **API 키 강제 없음** — `cp .env.example .env` 후 로컬 모델만으로 전체 루프가 돌아야 한다.
- **점진적 기능 분리** — MVP는 작게, Phase 2/3는 플러그인처럼 추가 가능한 구조.

---

## 2. 어댑터 패턴 (★ 최우선 설계 규칙)
모든 AI 기능(LLM/TTS/STT/Q&A/Slide-Critic)은 **어댑터 인터페이스**로 추상화한다. 기본 구현은 로컬, 클라우드는 환경변수로 스위칭하는 선택적 플러그인이다. **클라우드 API 직접 하드코딩 금지 — 항상 팩토리/인터페이스 경유, 항상 로컬 폴백.**

```typescript
// lib/ai/types.ts — 단일 진실원
interface ScriptGeneratorAdapter {
  generate(slides: SlideContent[], options: GenOptions): Promise<Script>;
  improve(script: Script, analysis: AnalysisResult, l1Profile?: L1Profile): Promise<ScriptDiff>;
}
interface TTSAdapter { synthesize(text: string, lang: string): Promise<AudioBuffer>; }
interface STTAdapter { transcribe(audio: AudioBuffer): Promise<TranscriptResult>; } // word-level timestamps 포함

// L1Profile: 모국어 기반 발음/표현 오류 패턴
interface L1Profile {
  language: string;                          // 'ko' | 'ja' | 'zh' ...
  commonPronunciationIssues: PhonemeRule[];  // 종성, 강세 위치 등
  commonExpressionIssues: ExpressionRule[];  // 관사 누락, 전치사 오류 등
}
interface PhonemeRule { targetPhoneme: string; commonSubstitution: string; description: string; }
interface ExpressionRule { pattern: string; issue: string; suggestion: string; }

interface QAGeneratorAdapter {
  generateQuestions(slides: SlideContent[], script: Script, count: number): Promise<QAItem[]>;
  evaluateAnswer(question: QAItem, answerTranscript: TranscriptResult): Promise<QAFeedback>;
}
interface QAItem {
  id: string; question: string; relatedSlideIndex: number;
  difficulty: 'easy' | 'tough';                                  // 'tough' = 약점을 파고드는 질문
  category: 'clarification' | 'challenge' | 'detail' | 'numbers';
}
interface QAFeedback {
  questionId: string; wpm: number; fillerWords: FillerWordResult[];
  relevanceScore: number; improvedAnswer?: string;
}

interface SlideCriticAdapter { analyze(slides: SlideContent[], targetDurationSec: number): Promise<SlideCritique[]>; }
interface SlideCritique {
  slideIndex: number; textDensity: 'low' | 'medium' | 'high';
  estimatedReadTimeSec: number; issues: string[]; suggestions: string[];
}
```

### 기본(로컬) 구현
| 기능 | 기본 구현 | 비고 |
|------|----------|------|
| Script / Q&A / Slide-Critic | **로컬 LLM via Ollama** (Llama 3.1 8B, Qwen2.5, **hermes3:8b** 등) | `OLLAMA_HOST`로 연결. 품질이 클라우드보다 낮을 수 있음을 README 명시 |
| TTS | **Piper** | CPU 실시간급, 다국어 |
| STT | **Whisper.cpp** (또는 faster-whisper) | word-level timestamp 필수 |
| 발음 분석 | STT confidence + 음소 정렬 휴리스틱 | 정교한 wav2vec2 평가는 Phase 2 옵션 |
| L1 Profile | 정적 규칙 파일(`lib/ai/l1-profiles/ko.json` …) | LLM이 규칙 참고해 피드백 문구 생성. 언어팩 = JSON 추가로 확장 |
| Slide Critic | 규칙 기반(글자수/줄수) 1차 → LLM 자연어 피드백 | **LLM 없이도 fallback 동작 필수** |

### 선택적 클라우드 어댑터 (환경변수로 활성화)
| 기능 | 클라우드 | 환경변수 |
|------|---------|---------|
| Script/Q&A | Claude API, OpenAI | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` |
| TTS | ElevenLabs, Azure | `ELEVENLABS_API_KEY` |
| STT | Whisper API, Azure Speech | `OPENAI_API_KEY`, `AZURE_SPEECH_*` |

```typescript
// lib/ai/factory.ts 패턴
function getScriptGenerator(): ScriptGeneratorAdapter {
  if (process.env.ANTHROPIC_API_KEY) return new ClaudeScriptGenerator();
  return new OllamaScriptGenerator(); // 기본값, 항상 동작
}
```
**규칙**: 클라우드 키가 있으면 우선, 없으면 로컬 폴백. 현재 동작 엔진을 UI에 명시.

---

## 3. 데이터 모델 (스키마 초안)
정식 스키마는 `lib/db/schema.ts`(Drizzle)를 단일 진실원으로 삼는다. 아래는 개념 초안 — 변경 시 마이그레이션을 함께 커밋한다.

- `Session`(slideFilePath, targetDurationSec, tone: formal|casual, language='en', **nativeLanguage** L1 매칭)
- `Slide`(index, textContent, notes)
- `Script`(version: 0=ai_demo / 1+=user|ai_improved, source, content: SlideScript[])
- `Recording`(scriptVersion, audioFilePath, durationSec)
- `AnalysisResult`(wpm, fillerWords[], slideTimeBreakdown[], pronunciationIssues[{…, l1Related}])
- `SlideCritiqueResult`(slideIndex, textDensity, estimatedReadTimeSec, issues, suggestions)
- `QASession` → `QAItem`(difficulty, category) → `QAAnswer`(wpm, fillerWords, relevanceScore, improvedAnswer)
- `Job`(type, status, progress, payload, result, error) — 비동기 추론 (DEVELOPMENT §6)

---

## 4. 코딩 컨벤션
- TypeScript **strict** 모드, 입력 검증은 **Zod**.
- 컴포넌트는 화면 단위 폴더(`app/(session)/upload` 등 — SCR ID 매핑).
- API 라우트는 **thin wrapper**, 로직은 순수 함수/클래스로 분리해 단위 테스트 가능하게.
- 외부 모델 호출(LLM/TTS/STT)은 전부 `lib/ai/` 하위, 직접 호출 금지 — 항상 팩토리/인터페이스 경유.
- 프롬프트는 `lib/ai/prompts/`에 템플릿으로 분리(인라인 금지).
- 환경변수는 `.env.example`에 전부 문서화(필수/선택 구분).
- 린트/포맷 **Biome**, 테스트 **Vitest + Playwright**.

---

## 5. Claude Code 작업 방식
- **항상 plan mode로 시작** — 변경 범위가 큰 작업은 계획을 먼저 제시하고 승인 후 구현.
- **작업 단위는 SCR/Epic** — 한 PR은 하나의 화면/모듈에 집중. 커밋 메시지에 SCR/Epic 태그.
- **서브에이전트 활용**: 넓은 코드 탐색은 Explore 에이전트, 설계 분기는 Plan 에이전트. 단, 단순 작업에 남발 금지.
- **어댑터 먼저, stub 먼저** — 새 AI 기능은 인터페이스 + stub 어댑터를 먼저 만들어 테스트/CI가 모델 없이 통과하게 한다.
- **검증 루프**: 변경 후 `biome check` → `tsc --noEmit` → `vitest run`. UI 변경은 `/run`으로 실제 동작 확인.

### 5.1 Hermes(로컬 Ollama) 활용
개발 환경에 로컬 Hermes(MCP, `hermes3:8b` on Ollama)가 붙어 있다. 두 가지 용도:
1. **개발 보조** — 오프라인/대량/사적 작업(픽스처 생성, 카피 초안, 분류·태깅, L1 규칙 후보 brainstorm)을 frontier 모델 호출 없이 로컬에서 싸게 처리. 프런티어급 추론 대체는 아님.
2. **제품 통합 레퍼런스** — Hermes는 곧 iamspeaker의 기본 엔진(Ollama LLM)과 동일 계열. `OllamaScriptGenerator`/`QAGenerator`의 **프롬프트·출력 스키마(JSON)를 로컬 모델로 미리 검증**하는 실측 베드로 쓴다. 실제 제품 코드는 MCP가 아니라 `lib/ai/`의 Ollama 어댑터(HTTP `OLLAMA_HOST`)로 호출한다 — MCP 의존성을 런타임에 넣지 않는다.

---

## 6. 작업 체크리스트 (구현 전)
1. `docs/storyboard.md`에서 해당 SCR/Epic을 확인했는가?
2. 어댑터 패턴(§2)을 따르는가? (클라우드 하드코딩 금지)
3. 로컬 모델만으로 동작하는가? (항상 폴백 존재)
4. 데이터 모델 변경 시 Drizzle 마이그레이션을 함께 작성했는가?
5. 환경변수 추가 시 `.env.example`에 반영했는가?
6. 순수 로직에 단위 테스트, 외부 모델은 stub로 대체했는가?
