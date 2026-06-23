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
import sys

import torch
import torchaudio
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

    # 1) 오디오 로드 → 16kHz mono
    waveform, sr = torchaudio.load(wav_path)
    if waveform.size(0) > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
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

    # 6) 강제정렬 → 음소별 점수
    aligned, scores = torchaudio.functional.forced_align(emission, targets, blank=blank_id)
    spans = torchaudio.functional.merge_tokens(aligned[0], scores[0])
    spans = [s for s in spans if s.token != blank_id]
    # 강제정렬은 target을 그대로 spell → spans와 target 1:1 대응
    n = min(len(spans), len(target_ids))

    # 7) 단어별 집계
    word_scores: dict[int, list[tuple[float, str, int]]] = {}
    for i in range(n):
        sp = spans[i]
        wi = tok_word_idx[i]
        word_scores.setdefault(wi, []).append((float(sp.score), tok_phoneme[i], int(sp.start)))

    out_words = []
    for wi in sorted(word_scores.keys()):
        items = word_scores[wi]
        # span.score는 평균 사후확률(0..1). 단어 confidence = 음소 평균.
        mean_conf = sum(s for s, _, _ in items) / len(items)
        worst = min(items, key=lambda x: x[0])
        start_frame = min(st for _, _, st in items)
        word_text = src_words[wi] if wi < len(src_words) else words_raw[wi]
        out_words.append(
            {
                "word": word_text,
                "startSec": round(start_frame * sec_per_frame, 2),
                "confidence": round(max(0.0, min(1.0, mean_conf)), 3),
                "worstPhoneme": worst[1],
            }
        )

    print(json.dumps({"words": out_words}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001
        log(f"gop.py error: {e}")
        sys.exit(1)
