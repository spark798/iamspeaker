# 벤치마크 (Benchmark) — 제안 모음

> ⚠️ 이 문서는 **참고/제안**이다. 코드·계획에 자동 반영되지 않는다. 채택하려면 사람이 CLAUDE.md/DEVELOPMENT.md 또는 PROGRESS §4에 반영한다.
> 갱신: `iamspeaker-benchmarker` 에이전트가 리서치 후 이 파일을 갱신(제안 추가/수정). 출처를 함께 적는다.

## 타깃 제품
- **AI 슬라이드/내레이션**: Gamma, Tome, Pitch — SCR-02 AI 데모 재생 UX.
- **스피치 코칭 피드백**: Yoodli, Poised, Orai, Speeko — SCR-05 리포트 시각화(WPM/필러/페이싱), 톤·제스처.
- **Q&A/면접 연습**: Google Interview Warmup, Yoodli Q&A — SCR-08 답변 평가 UX.
- **발표 연습 일반**: (추가 발굴) — 콜드스타트 해소, 반복 추이.

## 제안 (status: proposed | accepted | rejected)
> 형식: `[화면/영역] 제안 — 근거(출처) — status`

- _(아직 리서치 전 — benchmarker가 채움)_

---

## B-001 — TED "황금 기준선" (Benchmarker 첫 과업) · status: proposed

TED 코퍼스를 **"좋은 발표"의 분포 기준**으로 내재화해 세 가지로 활용한다. 파인튜닝 없이 메트릭·eval·프롬프트 보강으로만.

### 활용 1 — 황금 기준선 (절대값 → 백분위)
- TED 메트릭 분포를 기준값으로: **WPM 130~160**, 일시정지(pause) 길이·빈도, 필러워드 빈도, 슬라이드 텍스트 밀도.
- 사용자 점수를 **절대값이 아니라 TED 분포 대비 백분위**로 환산해 리포트(SCR-05)에 표시.
- 연계 코드: `lib/analysis/speech.ts`(WPM/필러), `lib/analysis/critique.ts`(텍스트 밀도). 백분위 환산 레이어를 분석 결과 위에 추가.

### 활용 2 — 자기개선 루프 (출력 품질 수렴)
- 우리 AI 생성 스크립트(`OllamaScriptGenerator`)를 **TED 패턴 부합도로 자가 채점** → 낮으면 프롬프트/few-shot/RAG 예시 보강 → 재측정.
- 파인튜닝 없이 출력 품질만 수렴. 연계: `lib/ai/prompts/`, `DEVELOPMENT.md §8.1 품질 진화 루프`.

### 활용 3 — 회귀 eval 셋 (퇴보 감지)
- TED 사례를 **정답 세트(gold set)**로 삼아, Slide Critic·Script Generator 변경 시 품질 퇴보를 감지.
- 연계: `test/contract/adapter-contracts.ts`(계약) 위에 품질 eval 스위트 추가. Reviewer가 변경 PR에서 참조.

### ⚠️ 필수 제약 (구현 전 반드시 충족)
1. **라이선스** — TED는 통상 **CC BY-NC-ND**. **원문(스크립트/영상) 재배포 금지.** 패턴·메트릭 같은 **비저작권 사실 데이터(분포 통계)와 eval 기준으로만 내재화**한다. 코퍼스 수집·저장 단계에서 **라이선스를 개별 확인**(자막 출처별로 다를 수 있음). 원문 텍스트를 repo/DB에 커밋하지 않는다.
2. **과적합 경계 (over-TED-ification 방지)** — TED를 유일 기준으로 삼으면 **모든 발표가 강연체로 수렴**한다. **장르별 기준선을 분리**: 피칭(pitch) vs 강연(talk) vs 강의(lecture). 세션의 `tone`/용도에 맞는 기준선을 선택 적용.

### 연계
3-에이전트 구조(Builder/Reviewer/Driver + Benchmarker)의 **Benchmarker 첫 과업**. Benchmarker는 리서치→이 문서 갱신(제안)만, 자동 반영 금지. 사람이 채택 시 §채택 로그 + CLAUDE.md/DEVELOPMENT.md/PROGRESS §4 반영.

## 채택 로그
- _(사람이 채택/반려한 항목 기록)_
