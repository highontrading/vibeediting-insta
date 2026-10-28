---
name: plan
description: Plan upcoming Vibe Editing posts into the Notion content calendar. Fills empty days (default the next 30) with Idea rows following docs/CONTENT_STRATEGY.md, with one Reel per day at 09:00 IST across three pillars (Proof, Studio, High-end), series by weekday, and a specific topic and creative brief per row, never repeating a topic. Use when asked to plan content, fill the calendar, or plan next month.
---

# Plan the content calendar

Read `CLAUDE.md`, `docs/CONTENT_STRATEGY.md` and `docs/CRAFT.md` first.

## 1. Look at what exists

Query `collection://08cdc86b-d366-4e63-b6f8-5f7d102fb484` for every row from the last 90 days onward
(Topic, Series, Post date, Status). Note which future days are already booked and which topics
were already used.

## 2. Decide the range

Default: from the first unbooked day (tomorrow at the earliest) through 30 days later. If the
person asked for a specific range, use that.

## 3. Write one row per empty day

The weekday decides the **Pillar** and **Series** (table in CONTENT_STRATEGY.md); where a day rotates
between series, continue the rotation from the previous week's rows. For each day, create a row with:

- **Topic**: specific and intriguing ("How noise-cancelling headphones erase sound", not "Tech explainer").
  Fictional brands and products get an original name.
- **Pillar**, **Series**, **Format** (CONTENT_STRATEGY.md → Planning rules), **Post type** = `Reel`, **Status** = `Idea`.
- **Post date** = `YYYY-MM-DDT09:00:00+05:30` with is_datetime = 1.
- **Brief**: 3–5 sentences a creative director would hand a motion team: the hook (first 2s), the
  story beats, the payoff, and suggested art direction (a design system or mood). For explainers and
  data stories, name the facts or data to use and a credible source.
  For **Proof** and **High-end** rows, the brief names the exact sentence to give the agent, the vibeediting
  features it shows off, the numbers to call out, and the footage plan: "owner clip from **Footage** if
  provided, else <a specific public-domain source>" (anonymous presenters only, no famous people). Leave
  **Footage** empty for the owner to fill.

Leave **Design system** empty; the producer picks it and rotates. Vary subjects across science, money,
tech, culture, design and nature. Create all rows in one batch call.

## 4. Report

Give a table of what you added (date, series, topic), and remind the person that rows can be edited,
moved or set to **Hold** in Notion.
