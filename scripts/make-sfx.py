"""Generates the original sound-effect library in public/sfx (48 kHz stereo WAV).

Everything is synthesised from noise and oscillators, so there are no licensing questions.
Run: python3 scripts/make-sfx.py
"""
import math
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def biquad_bandpass(x, f0, q):
    """Time-varying band-pass; f0 is an array (Hz) the same length as x."""
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        if i % 32 == 0:
            w0 = 2 * math.pi * min(f0[i], SR * 0.45) / SR
            alpha = math.sin(w0) / (2 * q)
            a0 = 1 + alpha
            b0, b2 = alpha / a0, -alpha / a0
            a1, a2 = -2 * math.cos(w0) / a0, (1 - alpha) / a0
        yi = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, x[i], y1, yi
        y[i] = yi
    return y


def lowpass(x, cutoff):
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def pink(n):
    white = rng.standard_normal(n)
    spec = np.fft.rfft(white)
    f = np.fft.rfftfreq(n)
    f[0] = f[1]
    return np.fft.irfft(spec / np.sqrt(f), n)


def norm(x, peak=0.89):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def fade(x, a=0.004, r=0.02):
    n = len(x)
    env = np.ones(n)
    na, nr = int(SR * a), int(SR * r)
    if na:
        env[:na] = np.linspace(0, 1, na)
    if nr:
        env[-nr:] *= np.linspace(1, 0, nr)
    return x * env


def stereo(mono, pan=None):
    """pan: array -1..1 over time (equal-power), or None for centre."""
    if pan is None:
        return np.stack([mono, mono], axis=1)
    ang = (pan + 1) * math.pi / 4
    return np.stack([mono * np.cos(ang), mono * np.sin(ang)], axis=1)


def write(name, data):
    if data.ndim == 1:
        data = stereo(data)
    data = np.clip(data, -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"{name}.wav  {len(data) / SR:.2f}s")


def whoosh(sec, lo, hi, q=1.4):
    t = t_axis(sec)
    x = pink(len(t))
    shape = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 1.6
    f0 = lo + (hi - lo) * np.sin(np.pi * t / sec) ** 2
    y = biquad_bandpass(x, f0, q) * shape
    pan = np.linspace(-0.7, 0.7, len(t))
    return stereo(norm(fade(y, 0.002, 0.03), 0.8), pan)


os.makedirs(OUT, exist_ok=True)

write("whoosh", whoosh(0.85, 350, 2600))
write("whoosh-short", whoosh(0.38, 600, 3800, q=1.1))

sw = whoosh(0.7, 300, 3200)[::-1]
write("swish-reverse", sw)

t = t_axis(1.4)
freq = 45 + 85 * np.exp(-t * 18)
body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 3.2)
click = lowpass(rng.standard_normal(len(t)), 2500) * np.exp(-t * 60) * 3
imp = np.tanh((body + click) * 1.8)
write("impact", norm(fade(imp, 0.0005, 0.1), 0.9))

t = t_axis(1.6)
freq = 30 + 70 * np.exp(-t * 2.4)
sub = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.minimum(1, t * 30) * np.exp(-t * 1.6)
write("sub-drop", norm(fade(np.tanh(sub * 1.5), 0.001, 0.2), 0.9))

t = t_axis(0.05)
c = biquad_bandpass(rng.standard_normal(len(t)), np.full(len(t), 3800.0), 4) * np.exp(-t * 140)
write("click", norm(fade(c, 0.0003, 0.005), 0.7))

t = t_axis(0.035)
tk = np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 180)
write("tick", norm(fade(tk, 0.0003, 0.004), 0.55))

t = t_axis(0.16)
pf = 520 + 520 * (1 - np.exp(-t * 60))
pp = np.sin(2 * np.pi * np.cumsum(pf) / SR) * np.exp(-t * 28)
write("pop", norm(fade(pp, 0.0008, 0.02), 0.7))

t = t_axis(2.4)
prog = t / 2.4
noise = biquad_bandpass(pink(len(t)), 300 + 5200 * prog**2.2, 0.9)
tone = sum(np.sin(2 * np.pi * np.cumsum(180 * 2 ** (3.2 * prog) * r) / SR) for r in (1, 1.5, 2.01)) / 3
ris = (noise * 0.8 + tone * 0.35) * prog**2.4
write("riser", stereo(norm(fade(ris, 0.05, 0.01), 0.85), np.sin(prog * 12) * 0.3 * prog))

t = t_axis(1.8)
notes = [1318.5, 1567.98, 1975.53, 2637.0]
sh = sum(np.sin(2 * np.pi * f * t + i) * (1 + 0.4 * np.sin(2 * np.pi * (5 + i) * t)) for i, f in enumerate(notes))
sh *= np.minimum(1, t * 8) * np.exp(-t * 2.2)
write("shimmer", stereo(norm(fade(sh, 0.01, 0.2), 0.5), np.sin(2 * np.pi * 0.6 * t) * 0.5))

t = t_axis(0.07)
ty = biquad_bandpass(rng.standard_normal(len(t)), np.full(len(t), 1900.0), 3) * np.exp(-t * 90)
ty += biquad_bandpass(rng.standard_normal(len(t)), np.full(len(t), 5200.0), 6) * np.exp(-t * 300) * 0.6
write("type", norm(fade(ty, 0.0002, 0.01), 0.6))

t = t_axis(0.32)
g = np.zeros(len(t))
seg = int(SR * 0.02)
for k in range(0, len(t), seg):
    f = rng.uniform(80, 1400)
    g[k : k + seg] = np.sign(np.sin(2 * np.pi * f * t[k : k + seg])) * rng.uniform(0.2, 1)
g = np.round(g * 6) / 6
write("glitch", stereo(norm(fade(g, 0.001, 0.02), 0.45), rng.uniform(-0.6, 0.6, len(t))))

# buzz: a phone vibrating on a desk, four pulses over ~1.9s
t = t_axis(1.9)
motor = np.sign(np.sin(2 * np.pi * 160 * t)) * 0.5 + np.sin(2 * np.pi * 320 * t) * 0.3
rattle = 1 + 0.35 * np.sin(2 * np.pi * 45 * t)
gate = np.zeros(len(t))
for on in (0.0, 0.5, 1.0, 1.5):
    a, b = int(on * SR), int((on + 0.36) * SR)
    ramp = int(0.01 * SR)
    gate[a:b] = 1
    gate[a : a + ramp] = np.linspace(0, 1, ramp)
    gate[b - ramp : b] = np.linspace(1, 0, ramp)
bz = lowpass(motor * rattle * gate + rng.standard_normal(len(t)) * 0.05 * gate, 1400)
write("buzz", norm(bz, 0.8))
