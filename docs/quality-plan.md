# 품질 향상 플랜 (상용화 기준 · 셀프호스트 OSS)

> 목표: 셀프호스트 OSS로서 **상용 제품(Yoodli·Poised·Speeko 등)에 뒤지지 않는 품질**.
> 트랙 = **A(셀프호스트 OSS)**. SaaS(인증·멀티테넌시·확장)는 보류(필요 시 Q3).
> 측정 원칙: "측정 못 하면 개선 못 한다" — 정확도 eval로 수치 입증하며 올린다.

## 감사 요약 (2026-06-23, 코드 검증)
- **강점**: 어댑터 패턴·전 경계 Zod·path-traversal 방어·4로케일 i18n·a11y/반응형·Docker 전체 검증·150 테스트·발음(GOP)/번역/점수 어댑터화.
- **핵심 갭(정확도)**: ① 데모 생성 품질(기본 8b 짧음) ② B-001 기준선 문헌 시드(미실측) ③ 필러 검출 사전 빈약(다어절·반복어·말늘임 미검출) ④ 발음 GOP 임계 미보정 ⑤ **정확도 정답셋·eval 부재**.
- **신뢰성 갭**: 잡 재시도/TTL/dead-letter 없음, 레이트리밋·오디오 magic-byte 없음.
- **성능**: 로컬 CPU 모델 지연 → 상용 응답성엔 큰 모델/GPU/클라우드 경로 권장.

## Q1 — 정확도 (핵심 가치) ← 진행 중
1. [x] **정확도 eval 하니스 + 정답셋** — `pnpm eval:accuracy`(필러 PRF), `lib/eval/accuracy.ts`, `eval/accuracy/fillers.json`. 베이스라인 F1 78.8%.
2. [x] **필러 검출 고도화** — 다어절·반복어·사전 확장(`fillerPositions`). eval F1 78.8%→100%(소규모셋, 데이터 확장 필요).
3. [ ] **B-001 기준선 실측** — TED-LIUM 분포 측정으로 시드값 대체(라이선스: 메트릭만).
4. [x] **발음 GOP 정밀화** — 오디오 eval로 측정: 강제정렬 cascade(치환 시 이웃 오검출) 발견 → decode-compare(자유디코드+NW 정렬) 위치 특정. precision 50→100%(FP 제거), F1 50→67%. 임계 env화. [ ] 잔여: 반복음소 미세치환은 time-anchor/실 L2 코퍼스(speechocean762) 필요.
5. [ ] **기본 품질 ↑** — 권장 모델/클라우드 연결 매끄럽게 + 인앱 기대치 안내.
6. [x] **정답셋 확장(필러)** — 14샘플 + like-동사 규칙, F1 게이트 0.9. [x] **WPM·발음 오디오 eval** — `pnpm eval:audio`(모델 게이트): WPM MAE/±15% 게이트, GOP 발음 PRF. 라이브 검증 통과. [ ] 인간 코퍼스 기반 절대정확도 확장은 지속.

## Q2 — 신뢰성 ✅
1. [x] **잡 재시도+지수백오프 · dead-letter · 완료 잡 TTL** — jobs.attempt/maxAttempts/nextRunAt(마이그 0006). fail()이 시도 여력 시 백오프 재큐, 소진 시 terminal failed(dead-letter). 재시도 중 queued로 되돌려 상태 폴링 클라이언트엔 투명(별도 dead 상태 미도입). Worker가 완료 잡 TTL 정리(JOB_TTL_HOURS). config: JOB_MAX_ATTEMPTS(3)/RETRY_BASE_MS(1000)/TTL_HOURS(24).
2. [x] **레이트리밋 · 오디오 magic-byte 검증** — `lib/ratelimit.ts` 인프로세스 고정창(라우트·IP별, 429+Retry-After), enqueue POST 8개 적용, RATE_LIMIT_* env. 오디오 magic-byte(wav/webm/ogg/opus/m4a/mp4/mp3/aac) — 그동안 무검사 통과하던 확장자 위장 차단.
3. [x] **사용자 친화 에러 메시지** — 상태코드별 현지화(429→tooManyRequests, 413→tooLarge) `errorKeyForStatus` + 5로케일. 서버 한국어 메시지가 멀티로케일 클라이언트에 노출되던 갭 해소.

## Q3 — 확장 (SaaS 추구 시에만)
9. [ ] 인증·멀티테넌시 10. [ ] Postgres+워커 분리 11. [ ] GPU/클라우드 추론 12. [ ] 리포트 PDF export

## 경쟁 제품 대비 체크(참고)
- Yoodli/Poised: 필러·페이싱·반복어 실시간 피드백 → 우리 필러 고도화(Q1-2)·추이(완료).
- Speeko: 발음·억양 → 우리 GOP(완료, 보정 필요 Q1-4).
- 공통: 깔끔한 리포트·온보딩 → 우리 a11y/반응형(완료), PDF·온보딩(Q3/후속).
