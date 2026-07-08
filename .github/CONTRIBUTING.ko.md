# 기여 가이드 (Contributing)

[English](CONTRIBUTING.md) · **한국어**

iamspeaker에 관심 가져주셔서 감사합니다. 작은 수정·이슈·언어팩 기여 모두 환영합니다.

## 개발 환경
- **Node 22 LTS** + **pnpm 11** (corepack: `corepack enable`)
- 로컬 모델(선택): [Ollama](https://ollama.com) · [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) · [Piper](https://github.com/rhasspy/piper) — 미설치여도 stub으로 개발 가능

```bash
pnpm install
cp .env.example .env
pnpm db:migrate         # SQLite 마이그레이션
pnpm dev                # http://localhost:3000
# (선택) pnpm setup:models  # 로컬 모델 다운로드
# (선택) pnpm preflight     # 외부 바이너리 점검
```

모델 없이 개발/테스트하려면 `USE_STUB_ADAPTERS=1`로 결정적 stub 어댑터를 강제합니다.

## 검증 (PR 전 필수)
CI와 동일한 게이트를 로컬에서 통과시켜 주세요. **출력을 `| tail` 등으로 자르지 말고 종료 코드로 확인**하세요.

```bash
pnpm lint          # Biome (포맷 + 린트)
pnpm typecheck     # tsc --noEmit (strict)
pnpm test          # Vitest 단위/통합
USE_STUB_ADAPTERS=1 pnpm e2e   # Playwright E2E
pnpm build
```

- 로컬 모델 계약 검증(선택): `OLLAMA_LIVE=1 OLLAMA_MODEL=<tag> pnpm test`, `PIPER_LIVE=1 ... pnpm test`
- Script Generator 품질 회귀: `pnpm eval` (자세한 내용 [`docs/benchmark.md`](docs/benchmark.md))

## 설계 원칙 (꼭 지켜주세요)
[`CLAUDE.md`](CLAUDE.md)가 단일 진실원입니다. 핵심:
- **어댑터 패턴** — 모든 AI 호출(LLM/TTS/STT/번역)은 `lib/ai/` 팩토리/인터페이스 경유. 클라우드 직접 하드코딩 금지, 항상 로컬 폴백.
- **로컬 우선 / 키 강제 없음** — `.env` 없이도 전체 루프가 동작해야 함.
- **경계 검증은 Zod** — API 입력·LLM 출력·env 전부.
- 데이터 모델 변경 시 **Drizzle 마이그레이션 동봉**(`pnpm db:generate`), 생성된 스냅샷도 `pnpm lint` 통과 확인.
- 환경변수 추가 시 `.env.example`에 문서화.

## 커밋 / PR
- 커밋·PR 제목에 **화면/모듈 태그**: `feat(SCR-04): …`, `fix(jobs): …`, `docs(...)`.
- 한 PR은 하나의 화면/모듈에 집중. 위 검증 게이트 통과 + 관련 테스트 추가.
- UI 문자열은 `messages/{ko,en,ja,zh,es}.json` **다섯 로케일 모두** 추가(키셋 일치 테스트가 강제).

## 언어팩 기여 (쉬운 시작)
모국어(L1) 발음/표현 교정 팩은 JSON 추가로 확장됩니다: `lib/ai/l1-profiles/<lang>.json` (ko/ja/zh 참고). 로더 등록 + `loadL1Profile` 테스트만 추가하면 됩니다.

## 버그·제안
[이슈 템플릿](ISSUE_TEMPLATE)을 사용해주세요. 보안 취약점은 [`SECURITY.md`](SECURITY.md) 참고(공개 이슈 금지).
