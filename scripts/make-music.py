"""Generates original background-music beds in public/music (64s each, converted to AAC .m4a).

Synthesised from scratch (no samples), so they're free to use. Each bed has a known BPM so
compositions can cut on the beat: frame of beat n = round(n * 60 / BPM * 30).
Pass bed names to build only those, e.g. `python3 scripts/make-music.py clay-hop-120`.
clay-hop-120 was then loudness-normalised: ffmpeg -i in.m4a -af loudnorm=I=-11:TP=-1.5:LRA=11 -c:a aac -b:a 192k out.m4a
Run: python3 scripts/make-music.py && for f in public/music/*.wav; do ffmpeg -y -i "$f" -c:a aac -b:a 192k "${f%.wav}.m4a" && rm "$f"; done
"""
import os
import sys
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


ONLY = set(sys.argv[1:])


def wanted(name):
    return not ONLY or name in ONLY


def master(l, r, name, bpm):
    if not wanted(name.rsplit(".", 1)[0]):
        return
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


# 4. clay-hop-120: playful and plucky for claymation and toy-like pieces (F → Dm → Bb → C).
#    Bars 0–1 marimba + pizzicato bass, bars 2–11 add soft drums, bar 12 on (24s) is a calm breakdown:
#    slow marimba, warm pad, no drums. Own RNG so the beds above never change.
if wanted("clay-hop-120"):
    crng = np.random.default_rng(29)
    bpm = 120
    beat = 60 / bpm
    bar = beat * 4
    n = int(SR * LEN)
    mar_l, mar_r = np.zeros(n), np.zeros(n)

    def marimba(f, length=0.6, decay=7.0):
        t = np.arange(int(length * SR)) / SR
        y = np.sin(2 * np.pi * f * t) * np.exp(-t * decay)
        y += 0.22 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * decay * 3.2)
        y += 0.06 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * decay * 6)
        return y * np.minimum(1, t / 0.002)

    prog = [[53, 57, 60, 65], [50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60]]  # F, Dm, Bb, C
    # 8th-note arpeggio index pattern per bar (None = rest): bouncy and syncopated
    arp = [0, 2, 1, 3, None, 2, 3, 1]
    for b in range(int(LEN / bar)):
        ch = prog[b % 4]
        calm = b >= 12
        if not calm:
            for i, a in enumerate(arp):
                if a is None:
                    continue
                f = note(ch[a] + 12)
                g = 0.5 if i % 2 == 0 else 0.38
                pan = 0.25 if i % 2 else -0.25
                tone = marimba(f)
                place(mar_l, tone, b * bar + i * beat / 2, g * (1 - pan))
                place(mar_r, tone, b * bar + i * beat / 2 + 0.004, g * (1 + pan))
            # a little answering lick on the last beat of every second bar
            if b % 2 == 1:
                for j, m in enumerate([ch[3] + 12, ch[2] + 24, ch[3] + 24]):
                    tone = marimba(note(m), 0.4, 9)
                    place(mar_l, tone, b * bar + 3 * beat + j * beat / 4, 0.22)
                    place(mar_r, tone, b * bar + 3 * beat + j * beat / 4, 0.3)
        else:
            for i, a in enumerate([0, 2, 1, 3]):
                f = note(ch[a] + 12)
                tone = marimba(f, 1.4, 3.0)
                place(mar_l, tone, b * bar + i * beat, 0.34)
                place(mar_r, tone, b * bar + i * beat + 0.006, 0.34)

    # pizzicato bass, bars 0–11
    bass = np.zeros(n)
    for b in range(12):
        root = prog[b % 4][0] - 12
        for i, off in enumerate([0, None, 12, None, 7, None, 12, 7]):
            if off is None:
                continue
            t = np.arange(int(0.22 * SR)) / SR
            f = note(root + off)
            tone = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 14) * np.minimum(1, t / 0.003)
            place(bass, tone, b * bar + i * beat / 2, 0.55 if i == 0 else 0.4)
    bass = lp_fft(bass, 1200)

    # soft drums, bars 2–11: kick on 1 and 3 (+ the "and" of 3), clap on 2 and 4, 16th shaker
    drums = np.zeros(n)
    kk = kick(0) * 0.8
    t = np.arange(int(0.18 * SR)) / SR
    clap = hp_fft(crng.standard_normal(len(t)), 900) * np.exp(-t * 32)
    clap = lp_fft(clap, 5000) * 0.6
    t = np.arange(int(0.05 * SR)) / SR
    shaker = hp_fft(crng.standard_normal(len(t)), 6000) * np.exp(-t * 90)
    for b in range(2, 12):
        s0 = b * bar
        for kb in (0, 2, 2.5):
            place(drums, kk, s0 + kb * beat, 0.85 if kb != 2.5 else 0.5)
        for cb in (1, 3):
            place(drums, clap, s0 + cb * beat, 0.7)
        for k16 in range(16):
            place(drums, shaker, s0 + k16 * beat / 4, 0.22 if k16 % 2 else 0.1)

    # warm pad under the breakdown (bar 12 on), very soft
    pl, pr = pad(prog, bar, LEN, cutoff=1100, detune=0.005)
    gate = np.zeros(n)
    s12 = int(12 * bar * SR)
    gate[s12:] = np.minimum(1, np.arange(n - s12) / (1.5 * SR))
    l = mar_l * 0.9 + bass + drums * 0.55 + pl * 0.08 * gate
    r = mar_r * 0.9 + bass + drums * 0.55 + pr * 0.08 * gate
    master(l, r, "clay-hop-120.wav", bpm)
