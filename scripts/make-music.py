"""Generates original background-music beds in public/music (64s each, converted to AAC .m4a).

Synthesised from scratch (no samples), so they're free to use. Each bed has a known BPM so
compositions can cut on the beat: frame of beat n = round(n * 60 / BPM * 30).
Run: python3 scripts/make-music.py && for f in public/music/*.wav; do ffmpeg -y -i "$f" -c:a aac -b:a 192k "${f%.wav}.m4a" && rm "$f"; done
"""
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "music")
rng = np.random.default_rng(11)
LEN = 64.0


def note(n):  # MIDI note -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def lp_fft(x, cutoff):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, len(x))


def hp_fft(x, cutoff):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / np.sqrt(1 + (cutoff / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(spec, len(x))


def saw(freq, t, phase=0.0):
    return 2 * ((freq * t + phase) % 1) - 1


def pad(chords, bar_sec, total, cutoff=1400, detune=0.004):
    n = int(SR * total)
    t = np.arange(n) / SR
    out_l, out_r = np.zeros(n), np.zeros(n)
    for i in range(int(total / bar_sec) + 1):
        chord = chords[i % len(chords)]
        s, e = int(i * bar_sec * SR), min(n, int((i + 1) * bar_sec * SR) + int(0.4 * SR))
        if s >= n:
            break
        tt = t[s:e] - t[s]
        env = np.minimum(1, tt / 0.6) * np.minimum(1, np.maximum(0, (tt[-1] - tt)) / 0.5 + 0.0001)
        for k, m in enumerate(chord):
            f = note(m)
            out_l[s:e] += (saw(f * (1 - detune), tt, 0.1 * k) + saw(f * (1 + detune / 2), tt, 0.37)) * env
            out_r[s:e] += (saw(f * (1 + detune), tt, 0.23 * k) + saw(f * (1 - detune / 2), tt, 0.71)) * env
    return lp_fft(out_l, cutoff), lp_fft(out_r, cutoff)


def kick(n_samples):
    t = np.arange(int(0.45 * SR)) / SR
    f = 42 + 110 * np.exp(-t * 32)
    k = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    return np.tanh(k * 2.2)


def hat():
    t = np.arange(int(0.06 * SR)) / SR
    return hp_fft(rng.standard_normal(len(t)), 7000) * np.exp(-t * 70)


def place(track, sample, at_sec, gain=1.0):
    s = int(at_sec * SR)
    e = min(len(track), s + len(sample))
    if s < len(track):
        track[s:e] += sample[: e - s] * gain


def bass_line(pattern, bpm, total, gain=0.5):
    n = int(SR * total)
    out = np.zeros(n)
    step = 60 / bpm / 2  # eighth notes
    i = 0
    while i * step < total:
        m = pattern[i % len(pattern)]
        if m is not None:
            t = np.arange(int(step * 0.9 * SR)) / SR
            f = note(m)
            tone = np.tanh((np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * 1.5) * np.exp(-t * 5)
            place(out, tone, i * step, gain)
        i += 1
    return lp_fft(out, 900)


def master(l, r, name, bpm):
    mix = np.stack([l, r], axis=1)
    mix = np.tanh(mix / (np.max(np.abs(mix)) or 1) * 1.6) * 0.8
    n = len(mix)
    fade_in, fade_out = int(0.5 * SR), int(2.0 * SR)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
    pcm = (mix * 32767).astype("<i2")
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"{name}  {n / SR:.0f}s  {bpm} BPM")


os.makedirs(OUT, exist_ok=True)

# 1. pulse-minimal-120: clean tech pulse (Am9 → Fmaj7 → Cmaj7 → G6)
bpm = 120
beat = 60 / bpm
chords = [[57, 64, 67, 71, 72], [53, 60, 64, 69], [48, 55, 59, 64, 67], [55, 59, 62, 64]]
l, r = pad(chords, beat * 4, LEN, cutoff=1600)
drums = np.zeros(int(SR * LEN))
k, h = kick(0), hat()
for i in range(int(LEN / beat)):
    if i >= 8:
        place(drums, k, i * beat, 0.9)
    place(drums, h, i * beat + beat / 2, 0.25 if i >= 4 else 0.12)
bass = bass_line([45, None, 45, 57, None, 45, 52, None, 41, None, 41, 53, None, 41, 48, None,
                  36, None, 36, 48, None, 36, 43, None, 43, None, 43, 55, None, 43, 50, None], bpm, LEN)
master(l * 0.22 + drums * 0.6 + bass, r * 0.22 + drums * 0.6 + bass, "pulse-minimal-120.wav", bpm)

# 2. ambient-glass-80: slow, airy, editorial (Dmaj9 → Bm11 → Gmaj7#11 → A6)
bpm = 80
beat = 60 / bpm
chords = [[50, 57, 61, 64, 66], [47, 54, 57, 62, 64], [43, 50, 54, 57, 61], [45, 52, 54, 57, 61]]
l, r = pad(chords, beat * 8, LEN, cutoff=2200, detune=0.006)
bell = np.zeros(int(SR * LEN))
for i in range(int(LEN / (beat * 2))):
    t = np.arange(int(1.6 * SR)) / SR
    f = note([74, 78, 81, 76, 73, 78][i % 6])
    place(bell, np.sin(2 * np.pi * f * t) * np.exp(-t * 2.5) * 0.5, i * beat * 2)
master(l * 0.3 + bell * 0.3, r * 0.3 + np.roll(bell, int(0.12 * SR)) * 0.3, "ambient-glass-80.wav", bpm)

# 3. drive-110: punchy, forward (Em → C → G → D) with driving 8th bass
bpm = 110
beat = 60 / bpm
chords = [[52, 59, 64, 67], [48, 55, 60, 64], [43, 50, 55, 59, 62], [50, 57, 62, 66]]
l, r = pad(chords, beat * 4, LEN, cutoff=1200)
drums = np.zeros(int(SR * LEN))
for i in range(int(LEN / beat)):
    place(drums, k, i * beat, 1.0)
    place(drums, h, i * beat + beat / 2, 0.3)
    place(drums, h, i * beat + beat * 0.75, 0.12)
bass = bass_line([40] * 8 + [36] * 8 + [43] * 8 + [38] * 8, bpm, LEN, gain=0.6)
master(l * 0.18 + drums * 0.7 + bass, r * 0.18 + drums * 0.7 + bass, "drive-110.wav", bpm)
