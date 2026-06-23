#!/usr/bin/env python3
"""
GOP(Goodness of Pronunciation) 발음 평가 — wav2vec2 음소 CTC + 강제정렬.

대본(reference)을 G2P로 음소열로 바꾸고, 오디오에 강제정렬(forced alignment)하여
음소별 음향 사후확률(GOP)을 구한다. STT 타임스탬프에 의존하지 않음.

입력(stdin JSON): {"wav": "<16k mono wav 경로>", "reference": "<대본 텍스트>"}
출력(stdout JSON): {"words": [{"word", "startSec", "confidence"(0..1), "worstPhoneme"}]}

의존성: scripts/pronunciation/requirements.txt + espeak-ng(시스템).
실패 시 비정상 종료(호출부가 휴리스틱으로 폴백).
"""
import argparse
import json
import os
import sys
import wave

import numpy as np
import torch
import torchaudio

# espeak-ng 시스템 설치 없이 번들 lib 사용(espeakng_loader). phonemizer import 전에 설정.
try:
    import espeakng_loader

    espeakng_loader.make_library_available()
    # espeak는 init path에 'espeak-ng-data'를 포함하는 디렉토리를 기대 → data_path의 상위.
    os.environ.setdefault("ESPEAK_DATA_PATH", os.path.dirname(espeakng_loader.get_data_path()))
except Exception:  # noqa: BLE001 — 시스템 espeak-ng가 있으면 그대로 진행
    pass

from phonemizer.backend import EspeakBackend
from phonemizer.separator import Separator
from transformers import AutoProcessor, Wav2Vec2ForCTC


def log(*a):
    print(*a, file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="facebook/wav2vec2-lv-60-espeak-cer")
    args = ap.parse_args()

    payload = json.load(sys.stdin)
    wav_path = payload["wav"]
    reference = (payload.get("reference") or "").strip()
    if not reference:
        print(json.dumps({"words": []}))
        return 0

    # 1) 오디오 로드(16-bit PCM WAV) → 16kHz mono. torchcodec 불필요하도록 stdlib wave 사용.
    with wave.open(wav_path, "rb") as wf:
        sr = wf.getframerate()
        ch = wf.getnchannels()
        raw = wf.readframes(wf.getnframes())
    data = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if ch > 1:
        data = data.reshape(-1, ch).mean(axis=1)
    waveform = torch.from_numpy(data).unsqueeze(0)  # (1, N)
    if sr != 16000:
        waveform = torchaudio.functional.resample(waveform, sr, 16000)
        sr = 16000

    # 2) 모델/프로세서
    processor = AutoProcessor.from_pretrained(args.model)
    model = Wav2Vec2ForCTC.from_pretrained(args.model)
    model.eval()
    blank_id = model.config.pad_token_id or 0

    # 3) emission (log-probs)
    inputs = processor(waveform.squeeze(0), sampling_rate=16000, return_tensors="pt")
    with torch.inference_mode():
        logits = model(inputs.input_values).logits  # (1, T, V)
    emission = torch.log_softmax(logits, dim=-1)
    n_frames = emission.size(1)
    sec_per_frame = (waveform.size(1) / sr) / n_frames

    # 4) 대본 → 단어별 음소(espeak IPA, 모델 어휘와 동일 계열)
    backend = EspeakBackend("en-us", with_stress=False)
    sep = Separator(word=" | ", phone=" ")
    phon = backend.phonemize([reference], separator=sep, strip=True)[0]
    words_raw = [w.strip() for w in phon.split("|") if w.strip()]
    ref_words = [w.split() for w in reference.split()]  # 표시용 단어 텍스트
    src_words = reference.split()

    # 5) 음소 토큰 → id, 단어 인덱스 추적
    tokenizer = processor.tokenizer
    vocab = tokenizer.get_vocab()
    target_ids: list[int] = []
    tok_word_idx: list[int] = []
    tok_phoneme: list[str] = []
    for wi, wphon in enumerate(words_raw):
        for ph in wphon.split():
            tid = vocab.get(ph)
            if tid is None:  # 모델 어휘에 없는 음소는 건너뜀
                continue
            target_ids.append(tid)
            tok_word_idx.append(wi)
            tok_phoneme.append(ph)
    if not target_ids:
        print(json.dumps({"words": []}))
        return 0

    targets = torch.tensor([target_ids], dtype=torch.int32)

    emis = emission[0]  # (T, V) log-softmax
    id2tok = {v: k for k, v in vocab.items()}

    # 6) 강제정렬 → 음소별 프레임 구간(startSec용).
    aligned, _scores = torchaudio.functional.forced_align(emission, targets, blank=blank_id)
    spans = [s for s in torchaudio.functional.merge_tokens(aligned[0], aligned[0].float()) if s.token != blank_id]
    start_frame_of = {}
    for i in range(min(len(spans), len(target_ids))):
        start_frame_of.setdefault(tok_word_idx[i], int(spans[i].start))

    # 7) 자유 디코드(greedy CTC) → 모델이 실제로 들은 음소열.
    #    모델 출력이 espeak 음소(참조 G2P와 동일 계열)라 시퀀스 정렬로 치환을 정확히 위치 특정
    #    → 강제정렬 cascade(치환 시 이웃 오검출) 회피.
    pred = emis.argmax(dim=-1).tolist()
    hyp: list[str] = []
    prev = None
    for t in pred:
        if t != prev and t != blank_id:
            tok = id2tok.get(t, "")
            if tok and not tok.startswith("<") and tok not in ("|", " "):
                hyp.append(tok)
        prev = t

    # 8) 참조 vs 자유디코드 NW 정렬 → 각 참조 음소 matched/error.
    status = align_ref(tok_phoneme, hyp)

    # 9) 단어별 집계: confidence = matched/total, worstPhoneme = 첫 오류 음소.
    by_word: dict[int, list[tuple[bool, str]]] = {}
    for i, st in enumerate(status):
        by_word.setdefault(tok_word_idx[i], []).append((st, tok_phoneme[i]))

    out_words = []
    for wi in sorted(by_word.keys()):
        items = by_word[wi]
        matched = sum(1 for ok, _ in items if ok)
        conf = matched / len(items)
        worst = next((ph for ok, ph in items if not ok), items[0][1])
        word_text = src_words[wi] if wi < len(src_words) else words_raw[wi]
        out_words.append(
            {
                "word": word_text,
                "startSec": round(start_frame_of.get(wi, 0) * sec_per_frame, 2),
                "confidence": round(conf, 3),
                "worstPhoneme": worst,
            }
        )

    print(json.dumps({"words": out_words}, ensure_ascii=False))
    return 0


def align_ref(ref: list[str], hyp: list[str]) -> list[bool]:
    """참조 음소열을 자유디코드열에 NW 정렬 → 참조 음소별 matched(True)/error(sub·del=False)."""
    n, m = len(ref), len(hyp)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    bt = [["" for _ in range(m + 1)] for _ in range(n + 1)]
    for i in range(1, n + 1):
        dp[i][0] = i
        bt[i][0] = "del"
    for j in range(1, m + 1):
        dp[0][j] = j
        bt[0][j] = "ins"
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            best, op = dp[i - 1][j - 1] + cost, "match" if cost == 0 else "sub"
            if dp[i - 1][j] + 1 < best:
                best, op = dp[i - 1][j] + 1, "del"
            if dp[i][j - 1] + 1 < best:
                best, op = dp[i][j - 1] + 1, "ins"
            dp[i][j], bt[i][j] = best, op
    status = [False] * n
    i, j = n, m
    while i > 0 or j > 0:
        op = bt[i][j]
        if op == "match":
            status[i - 1] = True
            i, j = i - 1, j - 1
        elif op == "sub":
            i, j = i - 1, j - 1
        elif op == "del":
            i -= 1
        else:
            j -= 1
    return status


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001
        log(f"gop.py error: {e}")
        sys.exit(1)
