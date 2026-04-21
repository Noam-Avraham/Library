# Code Review — AvrahamLibrary
_Date: 2026-04-21 | Reviewer: Claude Sonnet 4.6_

---

## REAL BUGS (broken behaviour)

| # | File | Issue | Fix | Status |
|---|------|-------|-----|--------|
| B1 | `backend/server.js` | `scoreResult()` called with wrong argument order for external recommendations — uses `pick.title` but should use `pick.original_title \|\| pick.title` | Fix argument | ⏳ |
| B2 | `backend/db.js` | `ORDER BY r.rating DESC NULLS LAST` — `NULLS LAST` is not standard sql.js SQLite syntax, may crash | Replace with `ORDER BY CASE WHEN r.rating IS NULL THEN 1 ELSE 0 END, r.rating DESC` | ⏳ |
| B3 | `frontend/src/components/BookshelfView.jsx` | `useCallback(measure, [])` — empty dependency array means ResizeObserver keeps a stale closure | Remove `useCallback` wrapper | ⏳ |
| B4 | `frontend/src/components/EditBookModal.jsx` | `useEffect` depends on the full `book` object — resets form state on every parent re-render | Change dependency to `[book?.id]` | ⏳ |
| B5 | `frontend/src/components/ReviewModal.jsx` | Rating label breaks for half ratings (e.g. 2.5 → undefined) | Replaced with `ratingLabel()` function | ✅ |

---

## AI / API PROTECTION

| # | File | Issue | Fix | Status |
|---|------|-------|-----|--------|
| A1 | `backend/server.js` `/api/scan-shelf` | No file size limit on base64 image | nginx `client_max_body_size 20m` added on VM; backend validation still missing: `if (imageBase64.length > 15_000_000) return res.status(400)` | ⚠️ partial |
| A2 | `backend/server.js` | No rate limiting on `/api/scan-shelf` and `/api/next-book` — calling them in a loop drains credits | Add `express-rate-limit` on AI endpoints | ✅ |
| A3 | `backend/server.js` | No input length validation on search query `q` — extremely long strings waste API quota | `if (!q \|\| q.length > 300) return res.status(400)` | ⏳ |

---

## PERFORMANCE

| # | File | Issue | Fix | Status |
|---|------|-------|-----|--------|
| P1 | `backend/db.js` | No indexes on `reviews(book_id)`, `reviews(user_name)`, `books(owner)`, `books(location)` — full table scans as library grows | Add `CREATE INDEX IF NOT EXISTS` statements in `initDB()` | ✅ |
| P2 | `frontend/src/components/AddBookModal.jsx` | No debounce on search — every character triggers state update | Debounce the API call by 300ms | ⏳ |

---

## ERROR HANDLING / UX

| # | File | Issue | Fix | Status |
|---|------|-------|-----|--------|
| E1 | `backend/db.js` | `require('../family.config.json')` crashes with cryptic error if file missing | Wrap in try/catch, throw friendly message | ✅ |
| E2 | `frontend/src/components/StatsPage.jsx` | `.catch(console.error)` — user sees blank page on failure with no explanation | Show error state in UI | ⏳ |
| E3 | `backend/server.js` | NLI key missing → empty results with no indication search was degraded | Log warning, optionally return `{ degraded: true }` | ⏳ |

---

## MINOR / SECURITY

| # | File | Issue | Fix | Status |
|---|------|-------|-----|--------|
| S1 | `backend/server.js` | `X-Powered-By: Express` header exposes stack | `app.disable('x-powered-by')` | ✅ |
| S2 | `backend/server.js` | CORS open to all origins (`cors()` with no options) | Fine for family app, but: `cors({ origin: ['http://localhost:5173', 'http://YOUR_VM_IP'] })` | ⏳ |
| S3 | `frontend/src/components/ReviewsPage.jsx` | Per-book review loading has no per-book spinner — all books show same loading state | Add `loadingBooks: Set<id>` state | ⏳ |

---

## RECENTLY FIXED (this session)

| # | What | How |
|---|------|-----|
| B5 | Half-star rating label broke for 0.5 increments | `ratingLabel()` function replaces array index lookup |
| — | Half-star ratings input + display | CSS overlay technique in `ReviewModal`, `ReviewsPage`, `BookReviewsModal` |
| A1 (partial) | Phone photos rejected by nginx (413 error) | `client_max_body_size 20m` in nginx config + 20MB label in UI |
| A1 | Backend image size validation added | `imageBase64.length > 15_000_000` check in `/api/scan-shelf` |
| B1 | External recommendations used wrong search query | Now searches by Hebrew title instead of original title |
| P1 | Missing DB indexes — full table scans | 4 indexes added in `db.js`: `reviews(book_id)`, `reviews(user_name)`, `books(owner)`, `books(location)` |
| — | Scanner location was free-text | Replaced with dropdown of existing locations + "אחר..." fallback (`/api/locations` endpoint) |
| A2 | No rate limiting on AI endpoints | `express-rate-limit` — 5 req/min on `/api/scan-shelf` and `/api/next-book` |
| S1 | X-Powered-By header exposed stack info | `app.disable('x-powered-by')` |
| E1 | Cryptic crash if `family.config.json` missing | try/catch with friendly error message |

---

## GIT / SECRETS

| # | Status |
|---|--------|
| `.env` ignored | ✅ |
| `family.config.json` ignored | ✅ |
| `*.db` ignored | ✅ |
| No hardcoded secrets in committed code | ✅ |
| `family.config.example.json` safe | ✅ |
| `backend/.env.example` safe | ✅ |

---

## PRIORITY ORDER (remaining)

1. **B2** — potential crash in production (NULLS LAST)
2. **A1** — add backend validation for image size (nginx covers it, but no friendly error)
3. **B1** — wrong recommendations ranking
4. **B3, B4** — subtle React bugs
5. **P1** — DB indexes (add now before library grows)
6. **A2** — rate limiting on AI endpoints
7. **S1** — one-liner security improvement
8. **E1** — better error on missing config
