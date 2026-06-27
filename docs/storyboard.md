# iamspeaker — Storyboard (Screen Flow & User Story)

**English** · [한국어](storyboard.ko.md)

> Source: converted from `AI_발표보조에이전트_스토리보드.docx` to Markdown.
> Screen IDs (SCR-XX) and Epic numbers are referenced consistently across code/issues/PRs.
> **SCR-01b / SCR-08 / Epic 6 / Epic 7**, newly defined in CLAUDE.md, are annotated in §6 of this document.

---

## 1. Overview

An agent where a non-native presenter uploads slides, the AI generates and shows a demo talk first, and once the user records a practice run for reference, it analyzes pace, pronunciation, and filler words to give feedback and automatically improve the script.

### Core value proposition
- The AI demos first so the presenter doesn't start from a blank page (cold-start removal)
- Feedback grounded in objective data (pace, pronunciation, time allocation, filler words)
- Gradual improvement by iterating on the script
- Auto-generated multilingual/accessibility versions (translation, voice, subtitles)

### Target persona
| Item | Description |
|------|------|
| Primary user | A Korean startup founder who has to pitch in English to overseas investors |
| Pain points | Limited English presentation experience; low confidence in pronunciation/pace/phrasing; nowhere to get feedback |
| Goal | Build a script using the AI demo before the investor pitch and raise polish through repeated practice |

---

## 2. End-to-end user flow

Two entry paths:
- **Path A (cold start)**: slides only → generate AI demo talk → user refines → practice/feedback loop
- **Path B (existing script)**: upload existing script + recording → analysis/feedback loop

### Step summary
1. Upload slides (PPTX/PDF)
2. [AI demo talk] analyze slides → auto-generate script → provide TTS voice / demo talk
3. The user writes/edits their own script using the AI demo for reference
4. The user records a practice run in their own voice
5. [Analysis engine] analyze WPM, pronunciation accuracy, filler words, per-slide time allocation
6. [Feedback report] visualized results + improved-script suggestions
7. The user applies the suggestions and re-practices (repeat)
8. [Optional] generate a multilingual version of the final script + subtitles (SRT)

---

## 3. Per-screen storyboard

| Screen ID | Name | Purpose | Next screen |
|---------|------|------|-----------|
| SCR-01 | Slide upload | Upload the slide file + presentation settings (target time · tone · language · **native language**) | SCR-01b |
| SCR-01b | Slide critique *(new)* | Feedback on information density · slide count vs. time · structure | SCR-02 |
| SCR-02 | AI demo talk | Play the generated script + voice synced to slides | SCR-03 |
| SCR-03 | Script editor | Write/edit the user script using the AI demo as a base | SCR-04 |
| SCR-04 | Practice recording | Record the talk in the user's own voice | SCR-05 |
| SCR-05 | Feedback report | Visualize the recording analysis (incl. L1-tailored) | SCR-06 |
| SCR-06 | Script improvement suggestions | Original/improved diff comparison, partial/full apply | re-practice→SCR-04 / SCR-08 |
| SCR-08 | Q&A prep *(new)* | Generate expected questions + record/analyze answers | SCR-07 |
| SCR-07 | Progress history / multilingual output | Per-take trend + translation·TTS·SRT generation | end / SCR-01 |

### Per-screen detail

**SCR-01 Slide upload** — drag-and-drop upload, supported formats (PPTX/PDF), presentation settings (target time e.g. 5 min, tone formal/casual, presentation language, **native-language selection**). Click "Generate demo" → SCR-01b.

**SCR-01b Slide critique (new)** — slide-level feedback right after upload (information density, slide count vs. time, structure). Between SCR-01 and SCR-02.

**SCR-02 AI demo talk** — slide viewer, per-slide generated script, play/pause, per-slide emphasis-point highlights. "Import to my script" or "Write my own".

**SCR-03 Script editor** — per-slide script input, AI-demo source reference (toggle), automatic estimated-time calculation.

**SCR-04 Practice recording** — record start/stop, slide-advance controls, live timer, (optional) screen/webcam capture.

**SCR-05 Feedback report** — overall summary (WPM, total time, filler-word count), per-slide time-allocation chart, list of words to fix in pronunciation (listen to native pronunciation), filler-word occurrence timeline.

**SCR-06 Script improvement suggestions (comparison view)** — left/right original/improved diff, explanation of the improvement, partial/full apply. Re-practice returns to SCR-04; on completion, SCR-08/SCR-07.

**SCR-08 Q&A prep (new)** — accessible after SCR-06. Generate expected questions (easy questions / weakness-probing questions) from slides + script; when an answer is recorded, evaluate WPM/filler words/answer relevance + show an improved-answer example.

**SCR-07 Progress history / multilingual output** — per-take WPM/filler-word trend graph, multilingual translation + TTS of the final script, subtitle (SRT) download.

---

## 4. Epic & user-story backlog

### Epic 0 — AI demo talk
- Upload slides only and the AI automatically generates a presentation script and demo voice
- Review the AI-recommended key message/emphasis per slide
- Set the AI demo's tone (formal/casual) and talk length (5 min / 10 min)
- Edit the AI demo script as a base to create your own version

### Epic 1 — Talk upload/analysis
- Auto analysis report when uploading a talk video/audio
- See the time spent per slide

### Epic 2 — Feedback
- Visually mark sections spoken too fast
- List of imprecisely pronounced words + listen to corrected pronunciation
- Filler-word frequency · location

### Epic 3 — Script improvement
- Rewrite into more natural English phrasing
- Before/after comparison

### Epic 4 — Multilingual/accessibility
- Translate the finished script + TTS voice
- Auto-generate subtitles (SRT)

### Epic 5 — Iterative learning
- Compare multiple practice records to see the improvement trend

---

## 5. MVP scope (original)

**MVP includes**: slide upload / AI demo-talk generation / user practice recording / analysis (WPM · filler words · time allocation · pronunciation) / feedback report + improved-script suggestion (1 version).

**After Phase 2**: video-based analysis / multilingual translation + TTS + SRT / per-take trend analysis.

---

## 6. Newly defined (added in CLAUDE.md)

**Epic 6 — Native-language-based tailored feedback (L1 Profile)**
- Enter your native language (e.g. Korean) to get feedback focused on the pronunciation/phrasing that speakers of that language commonly get wrong (SCR-01 selection → reflected in SCR-05/06)
- Distinguish general pronunciation correction from "parts I commonly get wrong due to my native language"

**Epic 7 — Slide critique and Q&A prep**
- Information density / slide count vs. time feedback right after upload (SCR-01b)
- Generate expected questions (easy + weakness-probing) from slides + script (SCR-08)
- Pace/filler-word/answer-relevance feedback + improved-answer example when recording answers to expected questions (SCR-08)
