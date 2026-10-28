"""Word-level transcript of raw talking-head clips (ElevenLabs Scribe), ready for editing.

Usage:  npm run transcribe -- public/raw/<Id>            # every .mp4/.mov in the folder, in name order
        npm run transcribe -- public/raw/<Id> --lang en  # force a language (default: auto-detect)
Writes public/raw/<Id>/transcript.json:
  {"clips": [{"file": "raw/<Id>/01.mp4", "duration": 8.0, "width": 720, "height": 1280, "fps": 24,
              "in": 0.42, "out": 7.61,                       # suggested trim: first word − 0.12s, last word + 0.3s
              "words": [{"text": "Most", "start": 0.54, "end": 0.75}, ...],
              "pauses": [{"start": 3.1, "end": 3.9}],        # gaps > 0.45s between words: jump-cut candidates
              "fillers": [{"text": "um", "start": 2.2, "end": 2.4}],
              "events": [{"text": "(laughs)", "start": 5.0, "end": 5.6}]}]}
Times are seconds in the source clip. Clips already transcribed (same file hash) are kept, so re-runs are free.
Needs ELEVENLABS_API_KEY and ffmpeg. Standard library only (no venv needed).
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILLERS = {"um", "uh", "erm", "er", "hmm", "mm", "uhm", "ah"}
PAUSE = 0.45


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


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:format=duration",
         "-of", "json", str(path)], capture_output=True, check=True, text=True).stdout
    d = json.loads(out)
    s = d["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return {"duration": round(float(d["format"]["duration"]), 3), "width": s["width"], "height": s["height"],
            "fps": round(int(num) / int(den), 3)}


def scribe(audio: bytes, lang: str | None) -> dict:
    key = api_key()
    b = uuid.uuid4().hex
    fields = {"model_id": "scribe_v1", "timestamps_granularity": "word", "tag_audio_events": "true", "diarize": "false"}
    if lang:
        fields["language_code"] = lang
    body = b"".join(f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode() for k, v in fields.items())
    body += f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"audio.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n".encode()
    body += audio + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body,
                                 headers={"xi-api-key": key, "Content-Type": f"multipart/form-data; boundary={b}"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs {e.code}: {e.read().decode(errors='replace')[:400]}")


def transcribe(path: Path, lang: str | None) -> dict:
    meta = probe(path)
    audio = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "22050", "-b:a", "64k", "-f", "mp3", "pipe:1"],
                           capture_output=True, check=True).stdout
    r = scribe(audio, lang)
    words = [{"text": w["text"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)}
             for w in r.get("words", []) if w.get("type") == "word" and w["text"].strip()]
    events = [{"text": w["text"], "start": round(w["start"], 3), "end": round(w["end"], 3)}
              for w in r.get("words", []) if w.get("type") == "audio_event"]
    pauses = [{"start": a["end"], "end": b["start"]} for a, b in zip(words, words[1:]) if b["start"] - a["end"] > PAUSE]
    fillers = [w for w in words if w["text"].lower().strip(".,!?…") in FILLERS]
    cut_in = max(0.0, words[0]["start"] - 0.12) if words else 0.0
    cut_out = min(meta["duration"], words[-1]["end"] + 0.3) if words else meta["duration"]
    return {**meta, "in": round(cut_in, 3), "out": round(cut_out, 3), "language": r.get("language_code"),
            "words": words, "pauses": pauses, "fillers": fillers, "events": events}


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit("Usage: npm run transcribe -- public/raw/<Id> [--lang en]")
    folder = (ROOT / args[0]).resolve()
    if not folder.is_dir():
        sys.exit(f"No folder {folder}")
    lang = args[args.index("--lang") + 1] if "--lang" in args else None
    files = sorted(p for p in folder.iterdir() if p.suffix.lower() in (".mp4", ".mov", ".m4v", ".webm"))
    if not files:
        sys.exit(f"No video files in {folder}")
    out = folder / "transcript.json"
    old = {c["file"]: c for c in json.loads(out.read_text())["clips"]} if out.exists() else {}
    clips = []
    for f in files:
        rel = str(f.relative_to(ROOT / "public"))
        sha = hashlib.sha256(f.read_bytes()).hexdigest()[:16]
        if old.get(rel, {}).get("sha") == sha:
            clips.append(old[rel])
            print(f"{rel}: unchanged, skipped")
            continue
        c = {"file": rel, "sha": sha, **transcribe(f, lang)}
        clips.append(c)
        text = " ".join(w["text"] for w in c["words"])
        print(f"{rel}: {c['duration']}s {c['width']}x{c['height']}@{c['fps']} keep {c['in']}–{c['out']}s, "
              f"{len(c['pauses'])} pauses, {len(c['fillers'])} fillers\n  “{text[:140]}”")
    out.write_text(json.dumps({"clips": clips}, indent=1))
    print(f"→ {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
