---
name: publish
description: Post the Vibe Editing videos that are due. Finds Notion calendar rows whose Post date has arrived, makes any video that is still missing, guards against double-posting, publishes to Instagram, and marks the rows Posted. Use when asked to publish or post due content, or when a scheduled autopilot run says /publish.
---

# Publish due posts

Read `CLAUDE.md` first (Notion IDs, status meanings).

## 1. Prepare

```bash
[ -d node_modules ] || npm ci
npm run ig:check
```

If `ig:check` fails with code 190, the token expired. Mark every due row **Failed** with
`Error: Instagram token expired — owner must generate a new one`, then stop and report it.

## 2. Find due rows

Query `collection://08cdc86b-d366-4e63-b6f8-5f7d102fb484` for rows whose **Post date** ≤ now and
whose **Status** is not `Posted` or `Hold`. Compare times with time zones: Post date carries its own offset.

- `Hold` → skip, always.
- `Idea`, `Producing` or `Failed` with no **Video URL** → follow the `/produce` skill for just that
  row first (only if Attempts < 3). If production fails, leave it Failed and move on.
- `Failed` with a **Video URL** (a failed post) → retry posting if Attempts < 3.
- `Review` → post it.

Post the oldest first, and at most **3** per run.

## 3. Post each row

1. **Double-post guard:** run `npm run ig:recent -- --json --limit 10`. If a post from the last 72h
   has the same first caption line as this row, it's already live. Fill in **Instagram URL**,
   **Media ID** and **Posted at** from that post, set **Status** = `Posted`, and don't publish again.
2. **Same-file guard:** if another row that is already `Posted` has the same **Video hash** as this
   row, don't publish. Mark this row Failed with `Error: duplicate of <other topic>`.
3. Re-read the row right before posting. If the owner switched it to `Hold` in the meantime, skip it.
4. Write the row's **Caption** to a temp file (outside the repo), then:
   `npm run ig:post -- --video "<Video URL>" --caption-file <tmpfile>`
5. Parse the `RESULT` line, then update the row: **Status** = `Posted`, **Instagram URL** = permalink,
   **Media ID**, **Posted at** = now, **Error** = empty.

If posting fails: **Status** = `Failed`, **Error** = the short message, **Attempts** = Attempts + 1.
The next run retries. If the message says the video couldn't be processed (container `ERROR`),
clear **Video URL** as well so `/produce` re-renders it.

## 4. Report

End with one line per row: posted (with link), skipped (and why), or failed (with error). If nothing
was due, say "Nothing due".
