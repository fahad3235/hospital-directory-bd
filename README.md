# Hospital Directory BD

Offline bilingual (English / বাংলা) directory of hospitals across Bangladesh — search, filter by division, and tap to call. Works fully offline; your added hospitals and favourites never leave your device.

![status](https://img.shields.io/badge/status-complete-brightgreen)
![tests](https://img.shields.io/badge/tests-16%2F16%20unit%20%2B%2045%2F45%20smoke-brightgreen)
![offline](https://img.shields.io/badge/offline-yes-blue)

## Problem

When someone in Bangladesh needs a hospital — especially in an emergency — the practical questions are simple: which hospital is near, is it government or private, does it have a 24-hour emergency department, and what number do I call? That information is scattered across dozens of sites, many of them out of date, and none of it works well offline on a low-end phone.

Hospital Directory BD answers those questions in one offline page: 24 major hospitals across all 8 divisions, national emergency numbers up top, and the ability to add your own local hospital.

## Features

1. **Search** — by hospital name (English or Bangla), district, or service (e.g. `shishu`, `cardiac`, `Sylhet`).
2. **Filters** — division (all 8), type (Government / Private), category (General / Specialized), 24-hour emergency only, favourites only; sort by name or division; per-division quick chips with counts.
3. **Hospital cards** — name in both languages, type/category/division badges, address, tap-to-call phone link (`tel:`), service tags, 24h-emergency badge.
4. **Emergency panel** — 999 National Emergency Service, 16263 DGHS Health Helpline, Square (10616) and Evercare (10678) hotlines, all tap-to-call.
5. **Your own hospitals** — add, edit and delete hospitals (validated form), star favourites; everything persists in `localStorage`.
6. **Backup** — export your hospitals + favourites as JSON, import a backup with strict validation (wrong app/version, bad entries, duplicate IDs and >200 entries are all rejected).

Plus: EN/বাংলা toggle (persisted, Bengali digits in stats), responsive down to 390px, zero network requests.

## Starter data

24 hospitals: 16 in Dhaka (incl. Dhaka Medical College Hospital, Bangladesh Medical University — formerly BSMMU/PG Hospital — NICVD, Dhaka Shishu Hospital, Square, Evercare, United) and one medical-college hospital per other division (Chattogram, Cumilla, Sylhet, Rajshahi, Khulna, Barishal, Rangpur, Mymensingh). Phone numbers are included **only** where a public listing was found; otherwise the card says the phone is not listed. See `DATA_NOTES.md` for the source of every phone number and the confidence rules.

> **Verify before you travel.** Details change. In a life-threatening emergency call **999** first. This directory is not affiliated with any hospital or the government, and it is not a medical service.

## Stack

- Plain HTML + CSS + vanilla JavaScript (classic `<script>` files, no build step, no dependencies) — chosen deliberately so the app also works when opened directly from disk (`file://`), where ES modules are blocked by CORS.
- All Bengali text is stored as `\uXXXX` escapes in the source files (pure ASCII), so pushes and tooling can never corrupt it; it renders as normal Bengali in the browser.

## Prerequisites

- Any modern browser (Chrome, Firefox, Safari, Edge). No server, no install, no account.

## Run locally

```bash
# Option A — open the file directly (works offline)
open index.html

# Option B — serve over HTTP (same result)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Testing

```bash
# Unit tests (Node 20+)
node --test tests/unit.test.mjs        # 16/16 pass

# Headless-Chrome smoke tests (uses the Playwright-cached headless_shell)
node tests/smoke.mjs 1280              # 45/45 pass
node tests/smoke.mjs 390               # 45/45 pass (mobile)
```

See `TEST_RESULTS.md` for the full results. Smoke tests assert real rendering: 24 cards, stats (24 / 8 divisions / 18 with 24h emergency), search, every filter, division chips, favourites, EN↔BN toggle, add/edit/delete with validation, persistence across reload, no horizontal overflow, zero console errors, zero page exceptions, zero non-`file://` network requests.

## Project structure

```
index.html          UI shell (all text via i18n keys)
styles.css          Clinical teal theme, responsive to 390px
js/
  data.js           24 starter hospitals + emergency numbers + divisions
  core.js           Pure logic: filter/search/sort/validate/import/export
  i18n.js           EN + BN strings, service labels
  app.js            DOM wiring, localStorage, dialogs, toasts
tests/
  unit.test.mjs     16 node tests over core.js / data.js / i18n.js
  smoke.mjs         45 headless-Chrome checks at 1280px and 390px
DATA_NOTES.md       Source + confidence notes for every starter fact
TEST_RESULTS.md     Real test results for this release
```

## Deployment

Static site — any static host works (GitHub Pages, Netlify, etc.). No build step: publish the repository root.

## Limitations

- Starter data covers 24 major hospitals only; smaller clinics and district hospitals are not listed — add them yourself with the in-app form.
- Phone numbers are from public listings checked in November 2026; numbers change. Entries without a listed phone show "Phone not listed".
- No live bed availability, doctor schedules, or directions — this is a directory, not a booking system.
- Data lives in the browser's `localStorage`; clearing browser data erases your additions (export a backup first).

## Status

Complete. Built 2026-11-13 (MUSE Project Factory run #319, 11:00 slot).
