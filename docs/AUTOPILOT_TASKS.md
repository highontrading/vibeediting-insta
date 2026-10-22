# Autopilot scheduled tasks

Create these three scheduled tasks at **claude.ai/code** (Scheduled tasks / Routines → New). For
**each** task, set:

- **Repository:** `highontrading/vibeediting.app`
- **Environment:** the one that holds `IG_ACCESS_TOKEN` and the Instagram network access
- **Connectors:** **Notion** (required: the calendar lives there)
- **Time zone:** Asia/Kolkata (IST)
- **Notifications:** on, so you hear about failures

| Task | Schedule (IST) |
|---|---|
| Vibe Editing: publish | Daily, 9:01 AM |
| Vibe Editing: publish backup | Daily, 10:13 AM |
| Vibe Editing: produce | Daily, 1:47 PM |

Cron equivalents, if the form asks: `1 9 * * *`, `13 10 * * *`, `47 13 * * *` (Asia/Kolkata).

## Prompt: publish (use it for both publish tasks)

```
You are the Vibe Editing Instagram autopilot (scheduled publishing run). Nobody is watching this session, so don't ask questions: act, then report.

1. Read CLAUDE.md in the highontrading/vibeediting.app repository.
2. Run the `publish` skill (.claude/skills/publish/SKILL.md) exactly as written. It posts every Notion Content Calendar row that is due, using the Notion connector and `npm run ig:post`.
3. You are authorized to push to the repository's `media` branch (video hosting) and to the branch you are working on. Never force-push, and never print or commit secrets.
4. Finish with the skill's one-line-per-row report. If anything failed (especially an expired Instagram token), put that first.
```

## Prompt: produce

```
You are the Vibe Editing Instagram autopilot (scheduled production run). Nobody is watching this session, so don't ask questions: act, then report.

1. Read CLAUDE.md in the highontrading/vibeediting.app repository.
2. Run the `produce` skill (.claude/skills/produce/SKILL.md) exactly as written. It makes the videos for Notion Content Calendar rows due in the next 3 days and moves them to Review.
3. You are authorized to push to the repository's `media` branch (video hosting) and to the branch you are working on. Never force-push, and never print or commit secrets.
4. Finish with the skill's report. If anything failed (especially an expired Instagram token), put that first.
```
