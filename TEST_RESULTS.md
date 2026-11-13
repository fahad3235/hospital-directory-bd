# TEST_RESULTS — hospital-directory-bd (run #319, 11:00 slot, 2026-11-13)

## Unit tests — 16/16 pass

Command: `node --test tests/unit.test.mjs` (Node v24.x)

- builtin data: 24 hospitals, all 8 divisions, integrity clean (`checkBuiltinData()` = [])
- builtin data: 18 with 24h emergency, 3 private, 8 specialized, 9 with phone; every entry has a Bengali name and ≥1 service
- emergency numbers: 4 entries — 999, 16263, 10616, 10678
- filter by division: Sylhet 1, Chattogram 2, Dhaka 16, all 24
- filter by type/category/emergency: private 3, govt 21, specialized 8, emergency-only 18, private+emergency 3
- search: `shishu` → Dhaka Shishu Hospital; `শিশু` → same; `cardio` → 4; `sylhet` → 1; case-insensitive; blank query → 24; no-match → 0
- favourites-only: 2 with 2 favs, 0 with none
- sort: by name first = Bangladesh Medical University, last = United Hospital; by division first = Barishal, last = Sylhet
- divisionName EN/BN; unknown id returns the id
- telHref: `02-55165001` → `tel:+880255165001`; `999` → `tel:+880999`; null/empty → null
- validateHospital: good entry clean; each bad field returns exactly its key; null → `invalid`
- makeCustomHospital: valid → `custom-<id>`, `custom: true`; invalid → `ok: false` with `name` error
- toggleFavourite: add/remove/idempotent
- export/import round-trip + strict rejection: good backup accepted; bad JSON, wrong app, wrong version, bad hospital, duplicate id, >200 entries all rejected; empty backup accepted
- Bengali digits: 24 → ২৪; formatCount BN/EN
- i18n: EN and BN key sets identical (all keys non-empty in both); fallback to EN; `results` pluralisation; service labels EN/BN; unknown service returns the key

## Smoke tests — 45/45 pass at 1280px, 45/45 pass at 390px

Command: `node tests/smoke.mjs 1280` and `node tests/smoke.mjs 390`
Harness: raw CDP against the Playwright-cached `headless_shell-1187`, app loaded over `file://`.

Verified at both widths: page title + h1; 24 cards; stats 24 / 8 divisions / 18 with 24h emergency; "24 hospitals found"; 8 division chips; 4 emergency cards with `tel:999` first; DMCH phone link `02-55165001`; search `shishu` → 1 card (Dhaka Shishu Hospital); no-match → empty state; clear filters → 24; division Sylhet → 1; type private → 3; 24h-only → 18; Rangpur chip → 1; favourite star activates and favourites-only → 1; BN toggle → Bengali h1, Bengali digits in stats, DMCH card shows ঢাকা; toggle back to English; add-hospital dialog opens, empty submit shows name error and keeps 24 cards, valid submit closes the dialog → 25 cards with custom badge, persisted in `localStorage`, phone link `tel:+88021234567`; edit renames the card (still 25); delete (confirm stubbed) → 24 cards and empty storage; favourite persists across reload; no horizontal overflow at either width; zero console errors; zero page exceptions; zero non-`file://` network requests.

## Repairs during this run (2, both test-side/app defects found by the tests)

1. **ES modules blocked over `file://`** (smoke run 1: 0 cards, CORS error in Log): the app used `<script type="module">` + `import`. Converted to classic `<script>` files (data → core → i18n → app) and rewrote the unit-test loader to Function-concatenation. This also fixes real-world use: the app now works when opened directly from disk.
2. **Astral-plane escape bug** in the ASCII-conversion step: the converter emitted invalid `\u1f4cd` for 📍/📞 (5 hex digits). Repaired to proper surrogate pairs (`\ud83d\udccd` / `\ud83d\udcde`).
3. **Smoke assertion fix (test-only):** the "BN card name" check read the first card (Bangladesh Medical University, whose Bengali name has no ঢাকা); changed to assert on the DMCH card.

## Files

All source files verified pure ASCII (`grep -P '[^\x00-\x7F]'` — zero matches in `index.html`, `styles.css`, `js/`, `tests/`). Bengali renders via `\uXXXX` escapes.
