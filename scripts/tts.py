"""Narration: ElevenLabs (studio voices) or Kokoro (open source, free).

Usage:  npm run tts -- <spec.json>
        npm run tts -- --voices          # list the ElevenLabs voices on the account (name → id)
spec.json:
  {
    "out": "public/voice/<CompositionId>",
    "engine": "elevenlabs",        # "elevenlabs" (needs ELEVENLABS_API_KEY) or "kokoro" (default)
    "voice": "George",             # ElevenLabs: voice name or id. Kokoro: bm_* British male, am_* American
                                   # male, af_*/bf_* female, hm_*/hf_* Hindi
    "model": "eleven_multilingual_v2",   # ElevenLabs only
    "settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.15, "use_speaker_boost": true},
    "lang": "en-gb",               # Kokoro only: en-us, en-gb, hi
    "speed": 1.0,
    "lines": [{"id": "l01", "text": "Viewers don't stay for information."}, ...]
  }
Writes <out>/<id>.wav per line (silence trimmed, 48 kHz) and <out>/timings.json:
  {"l01": {"duration": 2.31, "words": [{"word": "Viewers", "start": 0.0, "end": 0.42}, ...]}, ...}
ElevenLabs word times are real (from its character alignment). Kokoro word times are estimated from
syllable weight inside each line, which is good enough for word-by-word captions.
Lines whose text, voice and engine haven't changed are skipped, so re-runs don't spend ElevenLabs credits.
Place lines in a composition with <Audio src={staticFile("voice/<Id>/l01.wav")}/> inside a <Sequence>.
"""
import base64
import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR_OUT = 48000
EL_API = "https://api.elevenlabs.io/v1"


def api_key() -> str:
    """ELEVENLABS_API_KEY from the environment, or from .env for local runs."""
    key = os.environ.get("ELEVENLABS_API_KEY")
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("ELEVENLABS_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"')
    if not key:
        sys.exit("ELEVENLABS_API_KEY is not set (environment or .env)")
    return key


def syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 1
    groups = re.findall(r"[aeiouy]+", w)
    n = len(groups) - (1 if w.endswith("e") and len(groups) > 1 else 0)
    return max(1, n)


def trim_bounds(x: np.ndarray, sr: int, thresh=0.01, pad=0.04) -> tuple[int, int]:
    idx = np.where(np.abs(x) > thresh)[0]
    if len(idx) == 0:
        return 0, len(x)
    return max(0, idx[0] - int(pad * sr)), min(len(x), idx[-1] + int(pad * sr))


def resample(x: np.ndarray, sr: int, to: int) -> np.ndarray:
    if sr == to:
        return x
    n = int(len(x) * to / sr)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def estimated_words(text: str, dur: float) -> list[dict]:
    words = text.split()
    weights = [syllables(w) + (0.6 if re.search(r"[,.;:!?]$", w) else 0) for w in words]
    total = sum(weights)
    t, ws = 0.0, []
    for w, wt in zip(words, weights):
        d = dur * wt / total
        ws.append({"word": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d
    return ws


# ─── ElevenLabs ──────────────────────────────────────────────────────────────────────────────

def el_request(path: str, body: dict | None = None) -> dict:
    key = api_key()
    req = urllib.request.Request(
        EL_API + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs {e.code}: {e.read().decode(errors='replace')[:400]}")


def el_voices() -> dict[str, str]:
    return {v["name"]: v["voice_id"] for v in el_request("/voices")["voices"]}


def el_voice_id(voice: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9]{20}", voice):
        return voice
    voices = el_voices()
    for name, vid in voices.items():
        if name.lower() == voice.lower() or name.lower().startswith(voice.lower() + " "):
            return vid
    sys.exit(f"No ElevenLabs voice named {voice!r}. Available: {', '.join(voices)}")


def decode_mp3(data: bytes) -> np.ndarray:
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(SR_OUT), "pipe:1"],
        input=data, capture_output=True, check=True,
    ).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def aligned_words(alignment: dict) -> list[dict]:
    """Group ElevenLabs' per-character times into words."""
    words, cur, start, end = [], "", 0.0, 0.0
    for ch, a, b in zip(alignment["characters"], alignment["character_start_times_seconds"], alignment["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                words.append({"word": cur, "start": start, "end": end})
            cur = ""
            continue
        if not cur:
            start = a
        cur += ch
        end = b
    if cur:
        words.append({"word": cur, "start": start, "end": end})
    return words


def el_line(text: str, voice_id: str, spec: dict, line: dict, prev: str, nxt: str) -> tuple[np.ndarray, list[dict]]:
    body = {
        "text": text,
        "model_id": line.get("model", spec.get("model", "eleven_multilingual_v2")),
        "voice_settings": {**spec.get("settings", {}), **line.get("settings", {})},
    }
    # Neighbouring lines keep the delivery continuous across separately generated clips.
    if prev:
        body["previous_text"] = prev
    if nxt:
        body["next_text"] = nxt
    speed = line.get("speed", spec.get("speed"))
    if speed:
        body["voice_settings"]["speed"] = speed
    r = el_request(f"/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128", body)
    return decode_mp3(base64.b64decode(r["audio_base64"])), aligned_words(r["alignment"])


# ─── Main ────────────────────────────────────────────────────────────────────────────────────

def main():
    if sys.argv[1:2] == ["--voices"]:
        for name, vid in el_voices().items():
            print(f"{vid}  {name}")
        return
    spec = json.loads(Path(sys.argv[1]).read_text())
    engine = spec.get("engine", "kokoro")
    out = ROOT / spec["out"]
    out.mkdir(parents=True, exist_ok=True)
    old = json.loads((out / "timings.json").read_text()) if (out / "timings.json").exists() else {}
    kokoro, voice_id = None, None
    timings = {}
    lines = spec["lines"]
    for i, line in enumerate(lines):
        voice = line.get("voice", spec.get("voice", "bm_george"))
        key = {"engine": engine, "voice": voice, "text": line["text"], "speed": line.get("speed", spec.get("speed", 1.0))}
        prior = old.get(line["id"])
        if prior and prior.get("key") == key and (out / f"{line['id']}.wav").exists():
            timings[line["id"]] = prior
            print(f"{line['id']}: unchanged, skipped")
            continue
        if engine == "elevenlabs":
            voice_id = voice_id if voice == spec.get("voice") and voice_id else el_voice_id(voice)
            prev = lines[i - 1]["text"] if i > 0 else ""
            nxt = lines[i + 1]["text"] if i + 1 < len(lines) else ""
            samples, words = el_line(line["text"], voice_id, spec, line, prev, nxt)
        else:
            from kokoro_onnx import Kokoro

            kokoro = kokoro or Kokoro(str(ROOT / "models/kokoro/kokoro-v1.0.onnx"), str(ROOT / "models/kokoro/voices-v1.0.bin"))
            lang = line.get("lang", spec.get("lang", "en-gb" if voice.startswith("b") else "en-us"))
            raw, sr = kokoro.create(line["text"], voice=voice, speed=key["speed"], lang=lang)
            samples, words = resample(np.asarray(raw, dtype=np.float32), sr, SR_OUT), None
        a, b = trim_bounds(samples, SR_OUT)
        samples = samples[a:b]
        peak = float(np.max(np.abs(samples))) or 1.0
        samples = samples / peak * 0.89
        sf.write(out / f"{line['id']}.wav", np.stack([samples, samples], axis=1), SR_OUT)
        dur = len(samples) / SR_OUT
        if words is None:
            words = estimated_words(line["text"], dur)
        else:  # shift alignment by the trimmed lead-in
            off = a / SR_OUT
            words = [{"word": w["word"], "start": round(max(0.0, w["start"] - off), 3), "end": round(min(dur, w["end"] - off), 3)} for w in words]
        timings[line["id"]] = {"duration": round(dur, 3), "words": words, "key": key}
        print(f"{line['id']}: {dur:.2f}s  {line['text'][:60]}")
    (out / "timings.json").write_text(json.dumps(timings, indent=1))
    print(f"→ {out.relative_to(ROOT)}/timings.json")


if __name__ == "__main__":
    main()
