# iamspeaker

> 슬라이드를 업로드하면 AI가 먼저 시범 발표(데모)를 생성하고, 사용자가 참고해 연습 녹음을 하면 **속도·발음·필러워드**를 분석해 피드백과 개선 스크립트를 제공하는 **오픈소스 발표 연습 웹앱**.

비영어권 발표자(예: 해외 투자자 앞에서 영어로 피칭하는 스타트업 창업자)가 백지 상태에서 시작하지 않도록 AI가 먼저 시범을 보여주고, 객관적 데이터 기반으로 반복 개선하도록 돕는다.

> ⚠️ **상태: 기획·설계 단계 (코드 작성 전).** 개발 진행 상황은 [`PROGRESS.md`](PROGRESS.md)를 참고.

## 핵심 원칙
- **오픈소스 / 셀프호스팅 우선** — 누구나 클론해서 띄울 수 있다.
- **로컬/오픈소스 모델 우선** — STT/TTS/LLM은 기본 로컬 동작. 클라우드 API는 *선택적 업그레이드*.
- **API 키 강제 없음** — `cp .env.example .env` 후 로컬 모델만으로 전체 루프가 돌아간다.
- **데이터는 전부 로컬 저장** — 업로드·녹음·분석 결과는 `data/`에만 저장된다 (프라이버시).

## 기능 (계획)
슬라이드 업로드(PPTX/PDF) → 슬라이드 분석 → AI 데모 발표(스크립트+TTS) → 스크립트 편집 → 연습 녹음 → 분석 리포트(WPM·필러워드·발음·시간배분, 모국어 맞춤 피드백) → 개선 스크립트 제안 → 예상 Q&A 대비 → 다국어/자막 출력.

화면·기능 명세는 [`docs/storyboard.md`](docs/storyboard.md), 설계는 [`DEVELOPMENT.md`](DEVELOPMENT.md) 참고.

## 요구 사항
- Node 20 LTS, pnpm
- ffmpeg, LibreOffice(headless) — 오디오 변환 / PPTX→PDF
- 로컬 모델 구동 기준 **RAM 8GB 이상 권장**
- 로컬 AI 엔진: [Ollama](https://ollama.com) (LLM) · [Piper](https://github.com/rhasspy/piper) (TTS) · [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) (STT)

## 빠른 시작 (예정)
```bash
# 1) 환경변수 (로컬 모델만으로 동작)
cp .env.example .env

# 2) Docker로 한 번에
docker compose up

# 또는 네이티브
pnpm install
pnpm setup:models    # Piper voice / Whisper 모델 다운로드
pnpm dev
```

## 클라우드 어댑터 (선택)
환경변수로 더 높은 품질의 클라우드 엔진을 켤 수 있다. 설정 시 우선 사용되고, 없으면 로컬로 폴백한다.

| 기능 | 클라우드 | 환경변수 |
|------|---------|---------|
| Script/Q&A | Claude API, OpenAI | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` |
| TTS | ElevenLabs | `ELEVENLABS_API_KEY` |
| STT | Azure Speech | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` |

전체 변수는 [`.env.example`](.env.example) 참고.

## 기여
화면 ID(SCR-XX)·Epic 번호를 커밋/PR에 동일하게 참조한다 (예: `feat(SCR-04): 녹음 컨트롤`). 작업 규칙은 [`CLAUDE.md`](CLAUDE.md).

## 라이선스
[MIT](LICENSE) © 2026 Seung Park
