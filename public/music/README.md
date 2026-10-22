# Music beds

| File | BPM | Mood | Good for |
|---|---|---|---|
| `pulse-minimal-120.m4a` | 120 | clean, techy, confident | UI motion, data stories, Swiss/Blueprint systems |
| `ambient-glass-80.m4a` | 80 | airy, editorial, calm | Editorial Noir, Luxe Mono, Terracotta, explainers |
| `drive-110.m4a` | 110 | punchy, forward | Acid Sport, Brutal Block, brand films, title sequences |

All three were generated from scratch by `scripts/make-music.py` (no samples, free to use).
Beat n lands on frame `round(n * 60 / BPM * 30)`. Cut on beats.

To add licensed tracks (e.g. from Artlist, Epidemic Sound or the Pixabay library), drop the file
here as `.m4a`/`.mp3`, add a row to this table with BPM and mood, and commit it.
