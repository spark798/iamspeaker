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

## B-001 — TED "황금 기준선" (Benchmarker 첫 과업) · status: accepted — 활용1 구현됨(2026-06-21), 활용2·3 대기

> ✅ **채택**(2026-06-21). 활용 1(백분위 점수 레이어) 구현 완료: `lib/analysis/baselines/{talk,pitch,lecture}.json` + `lib/analysis/percentile.ts` + report API/뷰. 장르는 talk 기본(장르 선택 UI 후속), WPM 비원어민 보정 적용. 활용 2(자가개선 루프)·3(회귀 eval)은 대기. pause·슬라이드밀도 메트릭은 측정 추가 후 점수화(현재 WPM·filler/분만).

TED 코퍼스를 **"좋은 발표"의 분포 기준**으로 내재화해 세 가지로 활용한다. 파인튜닝 없이 메트릭·eval·프롬프트 보강으로만.

> 📌 **리서치 결과 요약(2026-06-21)** — 아래 §리서치 결과에 출처·수치·라이선스 결론·구현 제안을 정리. 핵심 인사이트: **TED 페이스(163~173 wpm)는 일반 권장(150~160)보다 빠르고, iamspeaker 핵심 사용자(비원어민/L1)에겐 과속** → TED를 *유일* 목표로 삼으면 안 됨. 기준선은 **장르 + 원어민 여부로 분리**.

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

### 리서치 결과 (2026-06-21, Benchmarker)

#### (1) 라이선스 결론 — 메트릭만 내재화, 원문 0 저장
- TED 자막/스크립트는 **CC BY-NC-ND 4.0**, 공개 ASR 코퍼스 **TED-LIUM은 CC BY-NC-ND 3.0**이며 "all talks and text are property of TED Conferences LLC". → **원문(스크립트/오디오) repo·DB 저장 금지.**
- **ND(NoDerivatives)**: 집계 통계(평균·분위수 같은 **사실 데이터**)는 저작물의 derivative가 아니며, 수치 자체는 저작권 대상이 아님 → **메트릭 분포 숫자 + 산출 방법론만 커밋**하면 ND·NC 모두 우회 가능.
- **NC(NonCommercial)**: 코퍼스 *재배포*에 걸리는 제약. 우리는 재배포하지 않고 로컬에서 메트릭만 산출 → 해당 없음. 단, 수집·저장 단계에서 코퍼스별 라이선스 **개별 재확인**(자막 출처가 다를 수 있음).
- **실행 원칙**: ① TED-LIUM/자체 측정으로 분포 *숫자만* 산출 → `lib/analysis/baselines/*.json`에 저장 ② 원문 텍스트·오디오는 빌드 산출물에 포함하지 않음 ③ JSON 헤더에 출처·라이선스·산출일·표본수 명기.

#### (2) 메트릭 분포 (공개 수치, 장르·원어민 분리)
> 1차는 공개 문헌 수치로 시드 → 이후 TED-LIUM 자체 측정으로 정밀화(표본수 명기).

| 메트릭 | TED(talk) | 일반 권장(talk) | 비원어민 보정(L1) | 출처 |
|--------|-----------|----------------|-------------------|------|
| **WPM** | 163~173 (2/3이 153~168) | 150~160 (NCVS) | **130~150** (느린 쪽 권장) | Six Minutes, VirtualSpeech, NCVS |
| **Pause** | ~5회/분, 대부분 <2s | 아이디어·강조 전 1~2s | 더 잦은 짧은 pause 허용 | TED Institute 2024, TheSpeakerLab |
| **Filler/분** | 프로 1~2 | 허용 3~7, >10 산만 | 관대하게(목표 ≤7) | Mic Buddy, U.Michigan |
| **슬라이드 밀도** | 미니멀(키워드) | 6×6 규칙(≤6줄·≤6단어/줄 ≈ ≤36단어), 10-20-30(≥30pt) | 동일 | PresentationTraining Inst., Microsoft 365 |

**장르 분리(over-TED-ification 방지) — 필수:**
- `talk`(강연, TED형): 위 TED 열.
- `pitch`(피칭/IR): 더 빠른 페이스 허용·수치 강조, 슬라이드 더 압축. iamspeaker 기본 시나리오(투자자 Q&A)와 직결.
- `lecture`(강의): 느린 페이스(이해 우선)·밀도 높은 슬라이드 허용.
- 세션의 `tone`/용도 → 장르 매핑해 해당 기준선 선택. **단일 TED 기준 강제 금지.**

#### (3) 비원어민(L1) 보정 — iamspeaker 차별점과 연결
- TED 페이스를 그대로 목표로 주면 비원어민이 과속·명료도 저하. → WPM 목표를 **L1 프로필별로 하향 조정**(예: ko 130~150). `lib/ai/l1-profiles/ko.json`에 `targetWpmRange` 같은 필드 추가 검토.
- 이건 [[project-iamspeaker-ted-benchmark]]의 "과적합 경계"를 구체화한 것 — 기준선은 (장르 × 원어민여부) 2축으로 분리.

#### (4) 데이터 소스 옵션 (수집 단계 라이선스 재확인 전제)
- **TED-LIUM 3** (HF `LIUM/tedlium`, CC BY-NC-ND 3.0): 452h 전사 — WPM/pause/filler 측정에 충분. 메트릭만 추출.
- **자체 측정 파이프라인**: 우리 STT(whisper.cpp) + `lib/analysis`로 동일 메트릭 산출 → 라이선스 무관 데이터로 검증·교차확인.
- 슬라이드 밀도: TED는 슬라이드가 적어 부적합 → **6×6/10-20-30 등 공개 규칙**을 기준값으로(저작권 무관).

#### (5) 구현 제안 (채택 시, 단계적 — 코드 자동반영 X)
1. `lib/analysis/baselines/{talk,pitch,lecture}.json` — 분포 숫자 + 출처/라이선스/표본 헤더(원문 0).
2. `lib/analysis/percentile.ts` — `toPercentile(value, metricBaseline)` 순수 함수. (장르×L1) 기준선 선택.
3. SCR-05 리포트: 절대값 + "기준선 대비 상위 N%" 표기. WPM 목표는 L1 보정값 사용.
4. (활용 2) 자가 채점: 생성 스크립트를 위 메트릭으로 평가 → 임계 미달 시 프롬프트/few-shot 보강 루프(`DEVELOPMENT.md §8.1`).
5. (활용 3) 회귀 eval: 고정 입력셋에 대한 Slide Critic·Script Generator 메트릭을 스냅샷 → 변경 PR에서 퇴보 감지(Reviewer 참조).

#### 출처
- Six Minutes — Average Speaking Rate: http://sixminutes.dlugan.com/speaking-rate/
- VirtualSpeech — Average Speaking Rate and WPM: https://virtualspeech.com/blog/average-speaking-rate-words-per-minute
- TED Terms / Usage Policy: https://www.ted.com/about/our-organization/our-policies-terms/ted-com-terms-of-use
- CC BY-NC-ND 4.0: https://creativecommons.org/licenses/by-nc-nd/4.0/deed.en
- TED-LIUM (HF, 라이선스): https://huggingface.co/datasets/LIUM/tedlium
- Mic Buddy — Filler Words guide: https://micbuddy.com/blog/filler-words-complete-guide/
- Presentation Training Institute — 6×6 Rule: https://www.presentationtraininginstitute.com/the-6-by-6-rule-for-presentations-explained/
- Microsoft 365 — 10-20-30 Rule: https://www.microsoft.com/en-us/microsoft-365-life-hacks/presentations/10-20-30-rule-of-powerpoint
- TheSpeakerLab — Power of the Pause: https://thespeakerlab.com/blog/pause-in-speech/

### 연계
3-에이전트 구조(Builder/Reviewer/Driver + Benchmarker)의 **Benchmarker 첫 과업**. Benchmarker는 리서치→이 문서 갱신(제안)만, 자동 반영 금지. 사람이 채택 시 §채택 로그 + CLAUDE.md/DEVELOPMENT.md/PROGRESS §4 반영.

## 채택 로그
- **2026-06-21** — B-001 채택. 활용 1(백분위 점수 레이어) 구현. 활용 2·3, pause/슬라이드밀도 점수화, 장르 선택 UI는 후속.
