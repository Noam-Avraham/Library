# Future Decisions — AvrahamLibrary
_Architectural choices worth thinking about before the codebase grows_

Each section is a real conflict: both sides are reasonable, and the right answer depends on how the app evolves.

---

## 1. Replace `sql.js` with `better-sqlite3`

**What:** `sql.js` is a JavaScript port of SQLite — it loads the entire database into RAM and re-writes the full file to disk on every change. `better-sqlite3` is a native Node.js binding to the real SQLite engine — much faster, does real incremental writes.

**Why it's tempting:** Right now every `INSERT` or `UPDATE` exports the whole DB and writes it to disk. With 50 books it's instant. With 5,000 books + reviews it will get noticeably slow.

| Pros | Cons |
|------|------|
| 10–100× faster writes | Requires compiled native addon (`node-gyp`) |
| Real WAL mode (crash-safe) | Slightly harder to set up on the VM |
| Industry-standard, well-documented | Would need to rewrite `init()`, `run()`, `get()`, `all()` wrappers |
| Doesn't load entire DB into RAM | Can't run in a browser (irrelevant here, but worth knowing) |

**Verdict:** Worth doing before the library exceeds ~500 books. It's a one-time migration of `db.js` only — no frontend changes needed.

---

## 2. Add a proper router (`react-router`) vs current tab state

**What:** Currently the app uses `activeTab` state in `App.jsx` to switch between library / stats / reviews. A real router would give each view a URL (`/library`, `/stats`, `/reviews`).

**Why it's tempting:** Right now if you share a link or refresh the page, you always land on the library tab. A router fixes that and makes the browser back button work.

| Pros | Cons |
|------|------|
| URLs are shareable and bookmarkable | Adds a dependency (`react-router-dom`) |
| Browser back/forward works correctly | Requires restructuring `App.jsx` significantly |
| Standard pattern for React apps | Overkill if the app stays family-only and private |
| Unlocks nested routes (e.g. `/books/42`) | Modals would need careful handling with URL state |

**Verdict:** Low priority while it's a family tool. If it ever becomes public or multi-user, do it then.

---

## 3. Migrate to TypeScript

**What:** Add TypeScript to the frontend (and optionally backend) so that data shapes — `Book`, `Review`, `FamilyMember` — are statically typed and checked at build time.

**Why it's tempting:** Currently if the backend changes a field name (e.g. `thumbnailUrl` → `coverUrl`), nothing warns you — it silently breaks at runtime. TypeScript catches this at compile time.

| Pros | Cons |
|------|------|
| Catches shape mismatches before they reach production | Requires adding types for every component prop |
| Autocomplete in VS Code becomes much more helpful | Migration of existing files is tedious (can be done gradually) |
| Makes refactoring safer | Adds a build step (already have Vite, so low overhead) |
| Standard in modern React projects | Overkill if you're the only developer |

**Verdict:** High value if the codebase keeps growing. Vite supports TypeScript out of the box — you can migrate one file at a time by renaming `.jsx` → `.tsx`.

---

## 4. Move AI scan to a background job vs current synchronous call

**What:** Currently the shelf scan sends the image, waits for Claude to respond (~10–30 seconds), then shows results. If the connection drops mid-request, the user sees an error and has to start over. A background job would accept the image, return immediately with a job ID, and let the frontend poll for results.

**Why it's tempting:** On a slow mobile connection, a 20MB image upload + 20 second AI wait in one HTTP request is fragile.

| Pros | Cons |
|------|------|
| Connection drop doesn't lose the result | Significantly more complex backend code |
| User can close the modal and check back | Needs a job queue (even a simple in-memory one) |
| Better UX on slow networks | Frontend needs polling logic |
| Scales better if multiple users scan simultaneously | For a family app, simultaneous scans are rare |

**Verdict:** Not worth it now. If scanning fails frequently on mobile, revisit. The nginx timeout (`proxy_read_timeout`) might need increasing first — cheaper fix.

---

## 5. Store thumbnails locally vs always fetching from Google Books URLs

**What:** Book covers are stored as Google Books URLs (e.g. `http://books.google.com/books/content?id=...`). These are external URLs that could change, go offline, or be slow to load.

**Why it's tempting:** If a cover URL breaks, the book shows a fallback letter icon. Storing images locally guarantees they always display.

| Pros | Cons |
|------|------|
| Cover always available, even offline | Disk space on the VM (each cover ~5–20KB, 1000 books = ~15MB — actually fine) |
| Faster load (served from same server) | Need a download step when adding a book |
| No dependency on Google's CDN | Need to serve static files from backend (`express.static`) |
| | Old books already in DB would need backfill |

**Verdict:** The disk space is negligible. Worth doing if covers load slowly on the family's connection. Implementation: on `POST /api/books`, if `thumbnailUrl` is a Google URL, download and save it to `backend/covers/`, serve from `/covers/:filename`.

---

## 6. Shared `Stars` component vs current duplication

**What:** The half-star display component (`Stars`) is currently copy-pasted in three files: `ReviewModal.jsx`, `ReviewsPage.jsx`, and `BookReviewsModal.jsx`.

**Why it's tempting:** If you want to change how stars look, you change it in three places. Easy to forget one.

| Pros of extracting | Cons |
|------|------|
| One place to update star appearance | Requires a new file (`src/components/Stars.jsx`) |
| Consistent rendering everywhere | Very minor — three tiny components |
| Easier to add features (e.g. show numeric value on hover) | |

**Verdict:** Easy win. Extract to `src/components/Stars.jsx` and import everywhere. The component is 8 lines — this is a 10-minute task with no risk.

---

## 7. Add simple PIN / passcode vs keeping the app open

**What:** Currently anyone on the network who finds the VM's IP can use the app. A simple PIN on first load would prevent strangers from adding/deleting books.

**Why it's tempting:** The app is exposed on a public IP.

| Pros | Cons |
|------|------|
| Prevents accidental or malicious edits | PIN in localStorage is not real security |
| Peace of mind | Family members need to know the PIN |
| Simple to implement (one React context + localStorage) | A determined attacker bypasses it easily |
| | Adds friction for family members |

**Verdict:** A PIN is "security theater" — it stops casual visitors but not anyone technical. Better alternative: restrict nginx to only allow your home IP range (`allow`/`deny` in nginx config). Simpler and actually effective for a family app.

---

## 8. React Query vs manual `useState` + `useEffect` fetching

**What:** Currently every component that needs data writes its own `useState(loading)`, `useState(data)`, `useEffect(() => fetch...)`, `.catch(console.error)`. React Query is a library that handles all of this — caching, loading states, refetching, error handling — automatically.

**Why it's tempting:** The same `getBooks()` call happens in multiple places. With React Query, the result is cached — the second caller gets it instantly from cache instead of making a second network request.

| Pros | Cons |
|------|------|
| Automatic caching — no redundant API calls | Another dependency to learn |
| Built-in loading/error states | Refactoring all existing fetches takes time |
| Auto-refetch on window focus (stays fresh) | For a family app with few users, caching matters less |
| Reduces boilerplate significantly | Adds conceptual complexity |

**Verdict:** Worth it if the app grows more pages and more data. For now, the manual approach works fine. A good future migration would be to start with `useQuery` in `ReviewsPage` (the most complex fetch) and expand from there.
