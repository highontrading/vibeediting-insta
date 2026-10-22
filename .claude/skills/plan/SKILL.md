---
name: plan
description: Plan upcoming Vibe Editing posts into the Notion content calendar. Fills empty days (default the next 30) with Idea rows following docs/CONTENT_STRATEGY.md: one post per day at 09:00 IST, series by weekday, topic + brief per row, no repeats. Use when asked to plan content, fill the calendar, or plan next month.
---

# Plan the content calendar

Read `CLAUDE.md` and `docs/CONTENT_STRATEGY.md` first.

## 1. Look at what exists

Query `collection://08cdc86b-d366-4e63-b6f8-5f7d102fb484` for all rows from the last 60 days
onward (Topic, Series, Post date, Status). Note:
- which future days already have a row, so you don't double-book them;
- which topics were already used, so you don't repeat them.

## 2. Decide the range

Default: from the first day without a row (tomorrow at the earliest) through 30 days later. If the
person asked for a specific range or count, use that instead.

## 3. Write one row per empty day

For each day, the weekday decides the **Series** (table in CONTENT_STRATEGY.md). Then create a row with:

- **Topic**: specific and concrete ("Glitch transitions", not "A cool transition").
- **Series** and **Format**: from the table.
- **Post type**: `Reel`.
- **Post date**: `YYYY-MM-DDT09:00:00+05:30`, with is_datetime = 1.
- **Status**: `Idea`.
- **Brief**: 2–4 sentences for the producer, covering the hook (first 1.5s), what's on screen
  scene by scene, the visual style, and the ending. For Prompt → Video, include the exact prompt
  to show on screen.

Create all the rows in one batch call.

## 4. Report

Give a table of what you added (date, series, topic), and remind the person that rows can be edited,
moved or set to **Hold** in Notion. The produce task makes each video up to 3 days before its date.
