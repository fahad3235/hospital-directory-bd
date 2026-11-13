# DATA_NOTES — hospital-directory-bd (run #319, 2026-11-13)

How the starter data was sourced, and what is — and is not — claimed.

## Rules applied

1. **Phone numbers only where a public listing was found.** 9 of 24 hospitals
   carry a phone number; the other 15 show "Phone not listed" rather than a
   guessed number. No phone number in this directory is invented.
2. **Names, type, category, division, district, address** are public facts
   (hospital names and locations). Divisional medical-college hospitals are
   listed with their city as the address rather than a street address that
   was not verified.
3. **Emergency 24h flag:** set where the hospital is a major general /
   medical-college hospital or a national institute with a documented
   24-hour emergency department (DMCH, Mitford, ShSMCH, NICVD, Dhaka Shishu,
   Mugda, Kurmitola, the three private generals, and all eight divisional
   medical-college hospitals). Bangladesh Medical University (PG Hospital),
   NIDCH, NICRH, NIMH, NIKDU and NIOH are marked non-24h because their
   emergency provision is specialist/outpatient-led, not a general 24h
   emergency department.
4. **BSMMU rename:** Bangabandhu Sheikh Mujib Medical University was renamed
   Bangladesh Medical University in 2025 (reported by mediabangladesh.net,
   27 Sep 2026). The entry uses the new name with "(formerly BSMMU / PG
   Hospital)" so it is still findable under the old name.

## Phone numbers and their sources (checked 2026-11-13)

| Hospital | Phone shipped | Source |
|---|---|---|
| Dhaka Medical College Hospital | 02-55165001 | bd-info.com government-hospital list (also lists 02-55165088); vymaps.com lists +880 2-55165001 |
| Bangladesh Medical University (BSMMU) | 02-55165760 | bd-info.com (range 02-55165760-94, first number used) |
| Shaheed Suhrawardy Medical College Hospital | 02-55026708 | shsmch.gov.bd official About page (0255026708) |
| NICVD | 02-9122560 | bd-info.com (02-9122560-74, first number used) |
| Dhaka Shishu Hospital | 02-55059051 | bd-info.com (02-55059051-60, first number used) |
| National Institute of Mental Health | 02-9118171 | bd-info.com |
| NIKDU | 02-9135690 | bd-info.com (02-9135690-4, first number used) |
| Square Hospital | 10616 | Square Hospital's published hotline |
| Evercare Hospital Dhaka | 10678 | Evercare Hospital's published hotline |

## Emergency numbers

| Number | What it is | Basis |
|---|---|---|
| 999 | National Emergency Service (police, fire, ambulance) | Government of Bangladesh national emergency number |
| 16263 | DGHS "Shastho Batayon" health helpline | Directorate General of Health Services health call centre |
| 10616 / 10678 | Square / Evercare hospital hotlines | The hospitals' published hotlines |

## Addresses verified against sources (2026-11-13 web search)

- DMCH: Secretariat Road, Shahbagh, Dhaka 1000 (Wikipedia; vymaps).
- BSMMU/BMU: Shahbagh, Dhaka (bd-info.com; mediabangladesh.net).
- ShSMCH: Sher-e-Bangla Nagar, Dhaka 1207 (shsmch.gov.bd).
- NICVD / Dhaka Shishu / NIMH / NIKDU / NIOH: Sher-e-Bangla Nagar, Dhaka
  (bd-info.com; mediabangladesh.net).
- NIDCH / NICRH: Mohakhali, Dhaka (mediabangladesh.net).
- Mitford: Mitford Road, Old Dhaka (public knowledge; no phone claimed).
- Square: Panthapath, Dhaka 1215; Evercare: Bashundhara R/A; United: Gulshan
  (public knowledge; United phone not claimed).

## What is NOT claimed

- No bed counts, doctor lists, fees, or opening hours are shipped — none were
  verified, so none are shown.
- No live data: the app makes zero network requests. Anything that changes
  (renames, numbers, addresses) will be stale until the data is updated.
- The directory is not affiliated with any hospital, DGHS, or the government.
