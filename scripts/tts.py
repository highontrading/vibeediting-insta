"""Narration with Kokoro TTS (open-source, Apache-2.0).

Usage:  npm run tts -- <spec.json>
spec.json:
  {
    "out": "public/voice/<CompositionId>",
    "voice": "bm_george",          # bm_* British male, am_* American male, af_*/bf_* female, hm_*/hf_* Hindi
    "lang": "en-gb",               # en-us, en-gb, hi
    "speed": 1.0,
    "lines": [{"id": "l01", "text": "Viewers don't stay for information."}, ...]
  }
Writes <out>/<id>.wav per line (silence trimmed, 48 kHz) and <out>/timings.json:
  {"l01": {"duration": 2.31, "words": [{"word": "Viewers", "start": 0.0, "end": 0.42}, ...]}, ...}
Word times are estimated from syllable weight inside each line — good enough for word-by-word captions.
Place lines in a composition with <Audio src={staticFile("voice/<Id>/l01.wav")}/> inside a <Sequence>.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
SR_OUT = 48000


def syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 1
    groups = re.findall(r"[aeiouy]+", w)
    n = len(groups) - (1 if w.endswith("e") and len(groups) > 1 else 0)
    return max(1, n)


def trim(x: np.ndarray, sr: int, thresh=0.01, pad=0.04) -> np.ndarray:
    idx = np.where(np.abs(x) > thresh)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * sr))
    b = min(len(x), idx[-1] + int(pad * sr))
    return x[a:b]


def resample(x: np.ndarray, sr: int, to: int) -> np.ndarray:
    if sr == to:
        return x
    n = int(len(x) * to / sr)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def main():
    spec = json.loads(Path(sys.argv[1]).read_text())
    out = ROOT / spec["out"]
    out.mkdir(parents=True, exist_ok=True)
    k = Kokoro(str(ROOT / "models/kokoro/kokoro-v1.0.onnx"), str(ROOT / "models/kokoro/voices-v1.0.bin"))
    timings = {}
    for line in spec["lines"]:
        voice = line.get("voice", spec.get("voice", "bm_george"))
        lang = line.get("lang", spec.get("lang", "en-gb" if voice.startswith("b") else "en-us"))
        speed = line.get("speed", spec.get("speed", 1.0))
        samples, sr = k.create(line["text"], voice=voice, speed=speed, lang=lang)
        samples = resample(trim(np.asarray(samples, dtype=np.float32), sr), sr, SR_OUT)
        peak = float(np.max(np.abs(samples))) or 1.0
        samples = samples / peak * 0.89
        sf.write(out / f"{line['id']}.wav", np.stack([samples, samples], axis=1), SR_OUT)
        dur = len(samples) / SR_OUT
        words = line["text"].split()
        weights = [syllables(w) + (0.6 if re.search(r"[,.;:!?]$", w) else 0) for w in words]
        total = sum(weights)
        t, ws = 0.0, []
        for w, wt in zip(words, weights):
            d = dur * wt / total
            ws.append({"word": w, "start": round(t, 3), "end": round(t + d, 3)})
            t += d
        timings[line["id"]] = {"duration": round(dur, 3), "words": ws}
        print(f"{line['id']}: {dur:.2f}s  {line['text'][:60]}")
    (out / "timings.json").write_text(json.dumps(timings, indent=1))
    print(f"→ {out.relative_to(ROOT)}/timings.json")


if __name__ == "__main__":
    main()
