# T-shirt sizing and story points

| Size | Points | Meaning | Seed estimate |
|------|--------|---------|---------------|
| XS | 1 | Trivial | 30 min |
| S | 2 | Small | 2 h (120 min) |
| M | 3 | Medium | 1 day (480 min) |
| L | 5 | Large | 2 days |
| XL | 8 | Extra large (prefer split) | 3+ days |

Weights for size rollups: XS=1, S=2, M=3, L=4, XL=5.

Seed estimates are calibrated from **AI-assisted billable work-log minutes** (and commit-span recovery when logs undercount). Effort uses **billable work-log minutes** only (idle auto-cap: next-day 12:00 UTC; session cap default 480). Never use calendar span.

## Calibration log

| Date | Item | Sized | Points | Est | Actual | Note |
|------|------|-------|--------|-----|--------|------|
| 2026-07-21 | T-006 | M | 3 | 480 | 46 | estimate 480->45; size M->XS |
| 2026-07-21 | T-002 | S | 2 | 120 | 14 | estimate 120->15; size S->XS |
| 2026-07-21 | T-009 | M | 3 | 480 | 14 | estimate 480->15; size M->XS |
| 2026-07-21 | T-010 | S | 2 | 120 | 14 | estimate 120->15; size S->XS |
