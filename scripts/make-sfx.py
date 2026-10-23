"""Generates the original sound-effect library in public/sfx (48 kHz stereo WAV).

Everything is synthesised from noise and oscillators, so there are no licensing questions.
Run: python3 scripts/make-sfx.py            (everything)
     python3 scripts/make-sfx.py squish ring (only the named files; the rest are left untouched)
"""
import math
import os
import sys
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


ONLY = set(sys.argv[1:])


def write(name, data):
    if ONLY and name not in ONLY:
        return
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


# ─── Clay foley (claymation pieces): squish, splat, plop, clink, boing, ring, ding, steam, sniff, hop ───
# A separate generator so these never change the sounds above.
crng = np.random.default_rng(23)


def env_ad(t, attack, decay):
    return np.minimum(1, t / max(attack, 1e-6)) * np.exp(-np.maximum(0, t - attack) * decay)


def wet_noise(t, f_hi, f_lo, sweep, q, flutter=0.5):
    """Band-passed noise sweeping down, with random wet 'crackle' amplitude flutter."""
    x = crng.standard_normal(len(t))
    f0 = f_lo + (f_hi - f_lo) * np.exp(-t * sweep)
    y = biquad_bandpass(x, f0, q)
    grains = lowpass(np.abs(crng.standard_normal(len(t))) ** 3, 180)
    return y * (1 - flutter + flutter * grains / (np.max(grains) or 1) * 3)


def sweep_sine(t, f):
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# squish: a soft clay squash, low thump + wet noise sweeping down
t = t_axis(0.38)
thump = sweep_sine(t, 60 + 90 * np.exp(-t * 30)) * env_ad(t, 0.003, 22)
wet = wet_noise(t, 2200, 380, 14, 2.2) * env_ad(t, 0.006, 11)
write("squish", stereo(norm(fade(np.tanh(thump * 1.2 + wet * 0.9), 0.001, 0.05), 0.85)))

# splat: the big one, a slap transient, a deeper body and a longer wet tail
t = t_axis(0.7)
slap = lowpass(crng.standard_normal(len(t)), 3800) * env_ad(t, 0.0005, 70)
thump = sweep_sine(t, 42 + 80 * np.exp(-t * 18)) * env_ad(t, 0.002, 9)
wet = wet_noise(t, 1700, 260, 7, 1.8, 0.7) * env_ad(t, 0.01, 6)
write("splat", stereo(norm(fade(np.tanh(slap * 0.9 + thump * 1.4 + wet), 0.0005, 0.1), 0.9)))

# plop: a clay ball popping out, a rounded upward "bloop"
t = t_axis(0.2)
bl = sweep_sine(t, 240 + 520 * (1 - np.exp(-t * 45))) * env_ad(t, 0.002, 24)
bl += 0.4 * sweep_sine(t, 2 * (240 + 520 * (1 - np.exp(-t * 45)))) * env_ad(t, 0.001, 40)
click = lowpass(crng.standard_normal(len(t)), 5000) * env_ad(t, 0.0003, 400) * 0.4
write("plop", stereo(norm(fade(bl + click, 0.0005, 0.03), 0.75)))

# clink: ceramic mug, inharmonic partials with fast decays
t = t_axis(0.7)
ck = sum(np.sin(2 * np.pi * f * t + i) * np.exp(-t * d) * a
         for i, (f, d, a) in enumerate([(2380, 9, 1.0), (3910, 13, 0.6), (5470, 17, 0.45), (7650, 24, 0.3), (9800, 30, 0.2)]))
ck += biquad_bandpass(crng.standard_normal(len(t)), np.full(len(t), 6000.0), 2) * env_ad(t, 0.0002, 300) * 0.6
write("clink", stereo(norm(fade(ck, 0.0003, 0.05), 0.7)))

# boing: a spring, pitch wobble that settles
t = t_axis(0.9)
f = 190 + 70 * (1 - np.exp(-t * 6)) + 55 * np.sin(2 * np.pi * 16 * t) * np.exp(-t * 4)
bo = (sweep_sine(t, f) + 0.35 * sweep_sine(t, 2 * f) + 0.15 * sweep_sine(t, 3 * f)) * env_ad(t, 0.004, 3.4)
write("boing", stereo(norm(fade(np.tanh(bo * 1.3), 0.001, 0.08), 0.75)))


def bell(t, base, decay):
    return sum(np.sin(2 * np.pi * base * r * t + k) * np.exp(-t * decay * (1 + k * 0.6)) * a
               for k, (r, a) in enumerate([(1, 1.0), (2.32, 0.55), (4.25, 0.35), (6.63, 0.18)]))


# ring: a twin-bell alarm clock, hammer alternating between two bells ~19 times a second, 5.6s
dur = 5.6
n = int(SR * dur)
rg = np.zeros(n)
strike_t = t_axis(0.4)
bells = [bell(strike_t, 1240, 9), bell(strike_t, 1395, 9)]
rattle = biquad_bandpass(crng.standard_normal(len(strike_t)), np.full(len(strike_t), 3200.0), 1.5) * np.exp(-strike_t * 120)
k = 0
pos = 0.0
while pos < dur:
    s = int(pos * SR)
    e = min(n, s + len(strike_t))
    jitter = 0.85 + 0.3 * crng.random()
    rg[s:e] += (bells[k % 2][: e - s] + rattle[: e - s] * 0.5) * jitter
    k += 1
    pos += 1 / 19.0 * (0.92 + 0.16 * crng.random())
ramp = np.minimum(1, t_axis(dur) / 0.01)
write("ring", stereo(norm(np.tanh(rg * ramp * 0.6), 0.9), np.sin(t_axis(dur) * 2 * np.pi * 9) * 0.25))

# ding: one soft strike of the same bell (the alarm, at peace)
t = t_axis(2.2)
dg = bell(t, 1240, 2.2) * np.minimum(1, t / 0.002)
write("ding", stereo(norm(fade(dg, 0.0005, 0.3), 0.6)))

# steam: a soft hiss that swells and fades
t = t_axis(1.6)
hs = biquad_bandpass(crng.standard_normal(len(t)), 5200 + 1500 * np.sin(np.pi * t / 1.6), 1.2)
hs *= np.sin(np.pi * np.clip(t / 1.6, 0, 1)) ** 1.5
write("steam", stereo(norm(fade(hs, 0.01, 0.1), 0.45), np.sin(t * 3) * 0.3))

# sniff: two quick sniffs and one long happy inhale
t = t_axis(1.0)
sn = np.zeros(len(t))
for start, length, f_from, f_to, amp in [(0.0, 0.11, 900, 1600, 0.7), (0.16, 0.11, 900, 1700, 0.75), (0.34, 0.5, 700, 2600, 1.0)]:
    a, b = int(start * SR), int((start + length) * SR)
    tt = t[a:b] - t[a]
    fr = f_from + (f_to - f_from) * tt / length
    burst = biquad_bandpass(crng.standard_normal(len(tt)), fr, 1.6) * np.sin(np.pi * tt / length) ** 1.2
    sn[a:b] += burst * amp
write("sniff", stereo(norm(fade(sn, 0.002, 0.05), 0.6)))

# hop: a tiny upward "bwip" as something leaves the ground
t = t_axis(0.15)
hp = sweep_sine(t, 300 * (3.6 ** np.clip(t / 0.09, 0, 1))) * env_ad(t, 0.003, 26)
write("hop", stereo(norm(fade(hp, 0.0005, 0.02), 0.55)))
# ── Paper-craft set (own generator, so the sounds above stay byte-identical) ──
prng = np.random.default_rng(23)


def crackle(n, density, lo=900.0, hi=6000.0):
    """Sparse random clicks, band-limited: the fibre crackle in paper sounds."""
    x = np.zeros(n)
    hits = prng.random(n) < density
    x[hits] = prng.uniform(-1, 1, hits.sum())
    return biquad_bandpass(x, np.full(n, (lo + hi) / 2), 0.7)


# paper: a cut-out sliding across card, a soft brushed rustle
t = t_axis(0.32)
env = np.sin(np.pi * np.clip(t / 0.32, 0, 1)) ** 1.5
brush = biquad_bandpass(pink(len(t)), 1800 + 1600 * np.sin(np.pi * t / 0.32), 0.8)
pp = brush * env + crackle(len(t), 0.004) * env * 0.5
write("paper", stereo(norm(fade(pp, 0.004, 0.04), 0.6), np.linspace(-0.3, 0.3, len(t))))

# tear: paper ripping, an accelerating train of fibre snaps over a noisy body
t = t_axis(0.55)
prog = t / 0.55
body = biquad_bandpass(rng.standard_normal(len(t)), 2200 + 1800 * prog, 1.2) * (0.3 + 0.7 * prog) * np.exp(-np.maximum(0, prog - 0.85) * 30)
snaps = crackle(len(t), 0.002 + 0.02 * prog**1.5) * 1.6
tr = (body + snaps) * np.minimum(1, t * 40)
write("tear", stereo(norm(fade(tr, 0.002, 0.03), 0.7), np.linspace(0.4, -0.4, len(t))))

# shutter: a mechanical leaf shutter, opening click, spring buzz, closing clack
t = t_axis(0.22)
sh = np.zeros(len(t))
for at, f, g in ((0.0, 4200.0, 1.0), (0.085, 2600.0, 1.3)):
    i = int(at * SR)
    seg = t[: len(t) - i]
    sh[i:] += biquad_bandpass(rng.standard_normal(len(seg)), np.full(len(seg), f), 3) * np.exp(-seg * 160) * g
spring = np.sin(2 * np.pi * 900 * t) * np.exp(-t * 40) * 0.12 * (t < 0.09)
write("shutter", norm(fade(sh + spring, 0.0003, 0.02), 0.75))
