# Changelog

All notable changes to iamspeaker are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.5.0] — 2026-06-28 — Expanded coaching + multilingual output

### Added
- **Word-usage coaching**: credibility-weakening hedging/risk-expression detection **and** a CEFR advanced-vocabulary check (live in the script editor), with prompt-injection so the AI avoids them in the first place.
- **Intonation analysis**: monotone-pitch detection from the recording (autocorrelation F0, octave-corrected; zero dependencies) → a prescriptive "intonation" coaching note.
- **Multilingual output**: choose a target language for translation, bilingual SRT subtitles, **and** translated TTS voice (Spanish/Chinese — Piper has no Korean/Japanese voice, so those fall back to translation + SRT only).
- **Auto-promoted GOP pronunciation**: runtime-detects the wav2vec2 stack and uses it automatically, falling back to heuristics otherwise (`PRONUNCIATION_SCORER=auto`).
- README note: swap models any time with zero code changes (`ollama pull` / one `.env` line) — the adapter-pattern payoff.

### Changed
- Home "how it works" cards now show real, locale-specific product thumbnails.
- 302 unit tests, CI green.

## [0.4.0] — 2026-06-27 — Slide viewer, report visualization, word-usage coaching

### Added
- **AI-demo slide viewer** — render your actual slides next to the script (PDF via unpdf + @napi-rs/canvas, PPTX via LibreOffice; lazy render + disk cache, graceful text fallback).
- **Report visualization** — headline gauge cards (WPM range gauge, pronunciation/delivery rings; zero-dep SVG).
- **Word-usage appropriateness** — hedging/risk-expression detection (report cue, improve injection, demo-generation avoidance).
- Demo **male voice** option (female/male) with a remembered preference.
- Home landing redesign (hero / 3 steps / trust points).

### Changed
- Public-ready: English README/CONTRIBUTING/storyboard (Korean preserved as `*.ko.md`), English `.github` templates, KO/EN screenshots, social preview, repo metadata.

## [0.3.0] — 2026-06-27 — The "coach" loop

### Added
- **Dashboard** — manage / search / delete your talks (DB + disk cleanup).
- **Iterative-practice motivation** — improvement headline, best take, goal-met, practice streak.
- **Custom goals** — WPM band & filler cap (non-native adjusted).
- **Re-practice loopback** — one click from report/improve to "practice this script again".
- **Prescriptive coaching notes** — per-slide "where & what" (pace · time · filler · monotone) with sourced principle tips.
- **Take-to-take comparison** (score deltas + coaching-note changes).
- **Public-speaking principle KB** — self-improvement modeling injected into generation/improve/critique/cues.

### Changed
- Repositioned from a one-off "teacher" to a "coach you train with every day" — an asynchronous after-the-fact review loop that accumulates practice history.

## [0.2.2] — 2026-06-21 — Real-use quality, accessibility, responsive

### Added
- UX: live recording timer, demo-voice failure notice, Q&A category i18n, first-run reachability check, long-wait feedback.
- Accessibility: `role="alert"` errors, `aria-live` status, `aria-hidden` decorative glyphs, landmarks/`aria-current`/labels.
- Responsive: mobile grid stacking, table overflow, header flex-wrap.

## [0.2.1] — 2026-06-21 — Multilingual wrap-up + cloud LLM + trends

### Added
- UI locales **ja/zh** + a cookie-based language switcher.
- Per-take trend graphs (WPM/filler, inline SVG).
- **Cloud LLM adapters** (Claude/OpenAI) + engine-status UI (keys via `.env` only).
- SRT subtitle export (original + native translation).
- Measured quality (qwen2.5:14b) → model recommendation table.

## [0.2.0] — 2026-06-21 — Quality baseline + multilingual

### Added
- **TED "golden baseline" (B-001)**: percentile scores vs. a good-talk distribution (WPM · fillers/min · pauses/min · slide density × genre × non-native WPM adjustment).
- **Self-improvement loop**: generate → self-score length → regenerate to target.
- **Regression eval** (`pnpm eval`): detect Script Generator quality drops (coverage gate).

## [0.1.0] — 2026-06-20 — Phase 1 core loop

### Added
- All 9 storyboard screens (SCR-01–08) working, local-models-first (Ollama LLM · Whisper.cpp STT · Piper TTS), the whole loop runs with no API key.
- Core loop: upload (PPTX/PDF) → slide critique → AI demo talk (script + voice) → edit → record → analysis report (WPM · fillers · pronunciation · time breakdown, L1-tailored) → improvement suggestions → expected-Q&A prep.
- Infrastructure: adapter pattern (local/cloud switching) · SQLite job queue + in-process worker + SSE · Zod boundary validation · path-traversal defense · deterministic stub-adapter E2E.

[0.5.0]: https://github.com/spark798/iamspeaker/releases/tag/v0.5.0
[0.4.0]: https://github.com/spark798/iamspeaker/releases/tag/v0.4.0
[0.3.0]: https://github.com/spark798/iamspeaker/releases/tag/v0.3.0
[0.2.2]: https://github.com/spark798/iamspeaker/releases/tag/v0.2.2
[0.2.1]: https://github.com/spark798/iamspeaker/releases/tag/v0.2.1
[0.2.0]: https://github.com/spark798/iamspeaker/releases/tag/v0.2.0
[0.1.0]: https://github.com/spark798/iamspeaker/releases/tag/v0.1.0
