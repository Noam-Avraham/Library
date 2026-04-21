# Code Review #2 — Readability, Duplication & Principles
_Date: 2026-04-21 | Focus: DRY, readability, coding principles_

---

## DUPLICATION (highest value to fix)

| # | Files | Issue | Fix |
|---|-------|-------|-----|
| D1 | `ReviewsPage.jsx`, `BookReviewsModal.jsx`, `ReviewModal.jsx` | `Stars` component copy-pasted 3× with identical logic | Extract to `src/components/Stars.jsx` |
| D2 | `ReviewsPage.jsx`, `BookReviewsModal.jsx`, `NextBookModal.jsx`, `AddBookModal.jsx` | `BookCover` component with fallback logic copy-pasted 4× | Extract to `src/components/BookCover.jsx` |
| D3 | `server.js` lines ~181, ~414, ~582 | NLI + Google Books merge algorithm copy-pasted 3× | Extract to `mergeNLIAndGoogle(nliBooks, googleBooks)` function |
| D4 | `BookSpine.jsx`, `BookCard.jsx`, `FilterBar.jsx`, `EditBookModal.jsx`, `AddBookModal.jsx` | Status array `['זמין','מושאל','רשימת משאלות']` and status styles redefined everywhere | Extract to `src/data/statuses.js` |
| D5 | 5 modal components | Fixed backdrop overlay pattern duplicated in every modal | Extract to `src/components/ModalOverlay.jsx` — or at minimum a shared style constant |

---

## READABILITY

| # | File | Lines | Issue | Fix |
|---|------|-------|-------|-----|
| R1 | `server.js` | 30–41 | `cleanAuthor` chains 6+ regex operations in sequence, impossible to read | Break into `removeRoleSuffix`, `removeRolePrefix`, `removeYearRanges` |
| R2 | `ReviewsPage.jsx` | 111–127 | 5-level filter chain with inline logic | Extract to `matchesFilters(book, summary, search, filterUser, filterMode)` |
| R3 | `ReviewsPage.jsx` | 137–139 | Loop variable `s` for summary entry — unclear | Rename to `bookSummary` or `summaryEntry` |
| R4 | `NextBookModal.jsx` | 145–146, 195 | Ternary nested inside template string inside JSX | Extract to `getRecommendationTitle(recMode)` |
| R5 | `BookSpine.jsx` | 61–75 | Popup positioning calculation has magic numbers (16, 8) with no explanation | Name constants `POPUP_WIDTH`, `POPUP_HEIGHT`, `VIEWPORT_PADDING` |

---

## CODING PRINCIPLES

| # | File | Lines | Issue | Fix |
|---|------|-------|-------|-----|
| P1 | `server.js`, `AddBookModal.jsx`, `EditBookModal.jsx`, `backend/db.js` | Multiple | Status strings `'זמין'`,`'מושאל'`,`'רשימת משאלות'` hardcoded as magic strings throughout | `backend/constants.js` + `src/data/statuses.js` |
| P2 | `server.js` | ~44 | `cleanNLIName` is just a wrapper that calls `cleanAuthor` — dead code | Delete it |
| P3 | `ReviewModal.jsx` | 6–8 | Color transform `{ ...c, active: c.dot }` done inside modal — unrelated to its job | Move to `config.js` or a shared helper |
| P4 | `frontend/src/api/index.js` | 8–10 | Error message loses which endpoint failed | Include `path` in thrown error message |
| P5 | Modal components | Various | Some modals return `null` when closed, others use `AnimatePresence` — inconsistent | Pick one pattern and apply everywhere |
| P6 | `ReviewModal.jsx` | 67–90 | Two separate `useEffect`s + `existingReview` prop + `existingData` state all managing the same thing | Consolidate into one effect |

---

## PRIORITY ORDER

1. **D3** — `mergeNLIAndGoogle()` — backend duplication, highest risk of diverging bugs
2. **D1** — shared `Stars` component — already causing visual inconsistency
3. **D2** — shared `BookCover` component — easy win, 4 copies
4. **P1** — status constants — magic strings scattered everywhere
5. **P2** — delete `cleanNLIName` — 30 second fix
6. **D4** — statuses.js file — goes with P1
7. **R1** — `cleanAuthor` readability
8. **R2** — filter extraction in ReviewsPage
9. **P6** — ReviewModal state consolidation
10. **R3–R5, P3–P5** — minor cleanup
