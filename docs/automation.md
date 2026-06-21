# 감독되는 자동화 (Supervised Automation)

> 목적: **자동 추진력은 얻되 품질·방향·비용 통제를 잃지 않는다.** 완전 자율 yes-루프가 아니라 조건부 진행 + 정지선(stop-line).
> 3개 역할: **Driver**(진행 게이트키퍼) · **Benchmarker**(리서치 제안) · **Reviewer**(규칙 검사). 이 문서가 단일 진실원.

---

## 0. 원칙
- Driver는 **Blocker가 없을 때만** 다음 단계로 진행하고, **정지선**에 걸리면 멈추고 사람에게 묻는다.
- Benchmarker는 `docs/benchmark.md`에 **제안만** 쓴다(코드/계획 자동 반영 X).
- Reviewer는 **프로젝트 규칙(CLAUDE.md/DEVELOPMENT.md)이 1순위·강제**, 벤치마크 인사이트는 **참고 자료**(권고).
- 비용 통제: 에이전트 스폰은 cold-start라 비싸다. Driver/Reviewer는 메인 세션에서 동작, Benchmarker만 스폰. 케이던스는 `/loop`.

---

## 1. Driver — 조건부 진행 + 정지선 + 단계 카운터

에이전트: `.claude/agents/iamspeaker-driver.md` (게이트키퍼 — 진행/정지 판정만, 코드는 메인 세션이 작성).

### 한 사이클
1. **다음 청크 선택**: `PROGRESS.md` §4 "다음 할 일"에서.
2. **정지선 점검** (아래). 하나라도 걸리면 → **STOP**(요약 + 질문).
3. 청크 구현(메인 세션).
4. **게이트**: `pnpm typecheck && pnpm lint && pnpm test` (UI/플로우면 빌드·E2E도). 실패 → STOP.
5. **Reviewer** 실행. 🔴 **Blocker → STOP**(수정 후 재검토). 🟡 Should-fix는 기록/판단.
6. PROGRESS 갱신 + 커밋 + (원격이면) 푸시 → **CI red → STOP**.
7. **단계 카운터 +1.** 카운터 ≥ **N(기본 3)** → 체크포인트 STOP(요약 + 계속 여부 확인) → 카운터 0.
8. 정지선 없으면 1로 반복.

### 🛑 정지선 (Stop-lines) — 하나라도 해당하면 멈추고 사람에게
1. Reviewer **Blocker**, 또는 typecheck/lint/test/build/E2E/**CI 실패**.
2. **사용자 결정 필요**: 레포 공개 범위, 비용 발생, 외부 서비스·도구·모델 설치, 크리덴셜/시크릿.
3. **되돌리기 어려움/외부 공개**: 원격 푸시(공개), 데이터 삭제, drop/파괴적 마이그레이션, force-push, 배포.
4. **기존 데이터 영향 스키마 변경**(테이블 재생성·non-additive 마이그레이션).
5. **보안 민감**(인증/시크릿/파일경로/외부 프로세스 spawn)이 확립된 패턴 밖일 때.
6. **아키텍처/스코프 결정**이 CLAUDE.md/DEVELOPMENT.md에 없을 때(추측 금지).
7. **단계 카운터 ≥ N** → 체크포인트.
8. **예산 임계**: 토큰/시간이 임계 도달.
9. **모호함**: 다음 청크가 불명확하거나 PROGRESS와 충돌.

### 기본값(조정 가능)
- 체크포인트 주기 N = **3 청크**.
- 게이트 = typecheck + lint + test(+ 빌드/E2E는 UI·플로우 변경 시).

---

## 2. Benchmarker — 주기적 리서치 → 제안만

에이전트: `.claude/agents/iamspeaker-benchmarker.md`. (스폰형, WebSearch/WebFetch)

- 산출: **`docs/benchmark.md`** 갱신 — 경쟁 제품 UX/기능 인사이트 + iamspeaker 적용 **제안**. 출처 명시.
- **자동 반영 금지**: 코드·CLAUDE·DEVELOPMENT를 바꾸지 않는다. 제안을 규칙으로 격상하려면 **사람**이 CLAUDE.md/DEVELOPMENT.md에 반영.
- 호출 시점: UX 비중 큰 화면 설계 직전, 또는 주기적(`/loop`/`/schedule`). 비용 고려해 상시 X.

## 3. Reviewer — 규칙 + 벤치마크 참고

에이전트: `.claude/agents/iamspeaker-reviewer.md`(기존).
- 프로젝트 규칙이 **강제(Blocker 판정 기준)**.
- `docs/benchmark.md` 인사이트는 **참고**(🟢 제안 수준). 규칙 아님.
- **회귀 eval(B-001 활용3)**: Script Generator/프롬프트/모델을 바꾸는 변경 PR이면 `pnpm eval` 실행을 권고.
  하드 게이트=커버리지(green 유지 필수), 페이싱/overall은 품질 추이 참고. coverage 하락 = Blocker 후보.

---

## 실행 방법
- **수동(권장 기본)**: 매 청크 후 게이트+Reviewer, 정지선 직접 점검.
- **케이던스**: `/loop`로 Driver 프롬프트 반복(정지선이 안전장치). 완전 무인 X.
- **벤치마크**: 화면 설계 전 `iamspeaker-benchmarker` 스폰 → docs/benchmark.md 검토 후 사람이 채택.
