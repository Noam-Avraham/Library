# Code Explanation — Family Library App

A guided tour of how the app is built: what every file does, how the pieces connect, and why certain decisions were made.

---

## Table of Contents

1. [Big Picture Architecture](#1-big-picture-architecture)
2. [Folder Structure](#2-folder-structure)
3. [Backend — How It Works](#3-backend)
   - [Database (db.js)](#31-database-dbjs)
   - [The REST API (server.js)](#32-the-rest-api-serverjs)
   - [External APIs — Book Search](#33-external-apis--book-search)
   - [AI Shelf Scanner](#34-ai-shelf-scanner)
4. [Frontend — How It Works](#4-frontend)
   - [Entry Point](#41-entry-point)
   - [App.jsx — Root State](#42-appjsx--root-state)
   - [Component Map](#43-component-map)
   - [Data Layer (src/data/)](#44-data-layer-srcdata)
   - [API Client (src/api/)](#45-api-client-srcapi)
5. [Configuration System](#5-configuration-system)
6. [Data Flow — End to End](#6-data-flow--end-to-end)

---

## 1. Big Picture Architecture

```
Browser (React SPA)
       │
       │  HTTP requests to /api/*
       ▼
  Vite dev server  ──proxy──►  Express backend (Node.js)
  localhost:5173               localhost:3001
                                     │
                               sql.js (SQLite)
                               library.db  (single file on disk)
                                     │
                       ┌─────────────┴──────────────┐
                  Google Books API          NLI (National Library)
                  (book search)             (Hebrew book search)
                                     │
                              Anthropic Claude API
                              (shelf photo scanner)
```

The frontend is a **Single Page Application (SPA)** — one HTML file, all UI updates happen in JavaScript without page reloads.

The backend is a **REST API** — it receives HTTP requests, talks to the database, and returns JSON.

The Vite dev server **proxies** all `/api/*` requests to the backend so the frontend never has to hardcode the backend URL. In production you would put Nginx or a similar reverse proxy in front of both.

---

## 2. Folder Structure

```
AvrahamLibrary/
│
├── family.config.json          ← All personal data: names, locations, colours
├── README.md                   ← Setup guide for new users
├── CODE_EXPLAINED.md           ← This file
│
├── backend/
│   ├── server.js               ← Express app — all API routes live here
│   ├── db.js                   ← Database init, schema, query helpers
│   ├── library.db              ← SQLite database (auto-created on first run)
│   ├── package.json            ← Backend dependencies
│   └── .env                    ← API keys (not committed to git)
│
└── frontend/
    ├── index.html              ← The one HTML file (Vite entry point)
    ├── vite.config.js          ← Vite config: dev proxy + @familyConfig alias
    ├── tailwind.config.js      ← Tailwind CSS configuration
    ├── package.json            ← Frontend dependencies
    └── src/
        ├── main.jsx            ← React bootstrap (ReactDOM.render)
        ├── App.jsx             ← Root component, global state, layout
        ├── index.css           ← Global CSS (Tailwind imports + custom classes)
        │
        ├── api/
        │   └── index.js        ← All fetch() calls to the backend in one place
        │
        ├── data/
        │   ├── config.js       ← Derived helpers from family.config.json
        │   ├── members.js      ← sortedMembers() + locationOptions() utilities
        │   ├── location.js     ← isWrongLocation() + expectedHome()
        │   └── genres.js       ← Static list of book genres
        │
        └── components/
            ├── Header.jsx          ← Top bar: title, tabs, action buttons
            ├── FilterBar.jsx       ← Search, owner filter, status filter, sort, view toggle
            ├── BookshelfView.jsx   ← Switches between ShelfView and GridView
            ├── BookSpine.jsx       ← Single book in shelf view (vertical spine)
            ├── BookCard.jsx        ← Single book in grid view (cover card)
            ├── AddBookModal.jsx    ← Search + add a new book
            ├── EditBookModal.jsx   ← Edit an existing book's details
            ├── TransferModal.jsx   ← Loan a book to someone / change location
            ├── ShelfScanner.jsx    ← Upload a shelf photo → AI identifies books
            ├── StatsPage.jsx       ← Statistics tab: charts and breakdowns
            ├── ReviewsPage.jsx     ← Reviews tab: read status + ratings per person
            └── ReviewModal.jsx     ← Modal to add/edit a review
```

---

## 3. Backend

### 3.1 Database (db.js)

The app uses **SQLite** through the `sql.js` library. Unlike typical SQLite bindings, `sql.js` is a pure JavaScript port of SQLite compiled to WebAssembly — no native compilation needed, works on any OS without extra setup.

The database is stored as a single binary file (`library.db`). After every write operation the whole DB is serialised back to disk with `fs.writeFileSync`.

**Schema — two main tables:**

```sql
-- Every book in the collection
CREATE TABLE books (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT NOT NULL,
  author         TEXT DEFAULT '',
  translator     TEXT DEFAULT '',
  thumbnailUrl   TEXT DEFAULT '',    -- cover image URL
  isbn           TEXT DEFAULT '',
  owner          TEXT DEFAULT '',    -- who the book belongs to
  current_holder TEXT DEFAULT '',    -- who has it right now (may differ from owner)
  location       TEXT DEFAULT 'בית', -- physical location
  status         TEXT DEFAULT 'זמין',-- זמין / מושאל / רשימת משאלות
  genre          TEXT DEFAULT '',
  description    TEXT DEFAULT '',
  created_at     DATETIME DEFAULT (datetime('now'))
);

-- People who can own / borrow books (seeded from family.config.json)
CREATE TABLE family_members (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Reading history and reviews
CREATE TABLE reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id     INTEGER NOT NULL,
  user_name   TEXT NOT NULL,
  rating      INTEGER,          -- 1–5, NULL means "marked as read only"
  review_text TEXT DEFAULT '',
  is_read     INTEGER DEFAULT 1,
  created_at  DATETIME DEFAULT (datetime('now')),
  UNIQUE(book_id, user_name)    -- one entry per person per book
);
```

**Three query helpers** exported from `db.js`:

| Helper | What it does |
|---|---|
| `run(sql, params)` | Executes INSERT / UPDATE / DELETE, saves DB to disk, returns `last_insert_rowid` |
| `get(sql, params)` | Returns the first matching row as a plain object (or `null`) |
| `all(sql, params)` | Returns all matching rows as an array of objects |

---

### 3.2 The REST API (server.js)

Every route follows the pattern: receive request → run SQL → return JSON. There is no authentication — the app is designed for local/home network use.

#### Books

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/books` | List all books. Optional query params: `?owner=נעם`, `?status=מושאל`, `?search=harry` |
| `POST` | `/api/books` | Add a new book. Body: `{ title, author, translator, thumbnailUrl, isbn, owner, location, status, genre, description }` |
| `PUT` | `/api/books/:id` | Update all fields of a book |
| `DELETE` | `/api/books/:id` | Delete a book permanently |
| `POST` | `/api/books/:id/transfer` | Loan operation — updates `current_holder`, `status`, `location` only |

The difference between `PUT` (full edit) and `POST /transfer` (loan) is intentional — the transfer modal only lets you change the holder/location, not the title, author, etc.

#### Book Search

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/search?q=query` | Search Google Books + NLI in parallel, merge and rank results |

#### Family Members

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/family` | List all family members from DB |
| `POST` | `/api/family` | Add a new member `{ name }` |
| `DELETE` | `/api/family/:id` | Remove a member |

#### Reviews

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/reviews?book_id=X` | All reviews for a specific book |
| `GET` | `/api/reviews/summary` | Aggregated: for each book, reader count + average rating + who read it |
| `POST` | `/api/reviews` | Add or update a review `{ book_id, user_name, rating, review_text }`. Uses `INSERT OR REPLACE` logic — one row per person per book. |
| `DELETE` | `/api/reviews/:id` | Delete a specific review |

#### Statistics & Scanner

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/stats` | Aggregated counts: by status, owner, location, genre, recent books, loans, wishlist |
| `POST` | `/api/scan-shelf` | Send a base64-encoded photo → AI returns identified books |

---

### 3.3 External APIs — Book Search

When a user searches for a book, the backend queries **two sources simultaneously** using `Promise.allSettled` (so one failing doesn't break the other):

**Google Books API** (`fetchGoogle`)
- Free, no key required (but rate-limited without one)
- Great for English books, cover images, descriptions
- Returns: title, author, ISBN, thumbnail, genre, description, page count

**Israeli National Library API** (`fetchNLI`)
- Requires an API key
- Better for Hebrew books, Israeli publications
- Returns: title, author, translator, ISBN, publisher, date

**Merge logic:**
1. If NLI and Google return the same ISBN, keep the NLI data but steal Google's thumbnail if NLI doesn't have one
2. Each result is scored by a `scoreResult()` function (title match quality + language match + data completeness)
3. The top result from each source is shown first ("featured"), rest sorted by score

**Author cleaning (`cleanAuthor`):**
Both APIs sometimes include role annotations in the author field, e.g. `"כהן, דוד, מחבר"` or `"Smith, John, author"`. The `cleanAuthor` function strips these with regex, along with year ranges like `(1965–2020)`.

---

### 3.4 AI Shelf Scanner

The `/api/scan-shelf` endpoint does two things:

**Step 1 — Vision model identifies books:**
The base64 image is sent to Claude (Anthropic's AI) with a prompt asking it to read every book spine in the photo and return a JSON array of `{ title, author }` objects.

**Step 2 — Search for each identified book:**
For each identified book, the backend runs the same NLI + Google search from above, returns the top 5 matches per book back to the frontend. The user then reviews the matches and picks which ones to add to their library.

---

## 4. Frontend

### 4.1 Entry Point

```
index.html  →  src/main.jsx  →  src/App.jsx  →  all components
```

`main.jsx` just mounts the React app into the `<div id="root">` in `index.html`. Vite handles bundling, hot-module replacement (HMR), and the dev server proxy.

---

### 4.2 App.jsx — Root State

`App.jsx` is the only place that holds **global state** — data that multiple components need:

| State | Type | Purpose |
|---|---|---|
| `books` | array | The current list of books (filtered by active filters) |
| `familyMembers` | array | All members from the DB (used in dropdowns everywhere) |
| `filters` | object | `{ search, owner, status }` — current filter values |
| `viewMode` | string | `'shelf'` or `'grid'` |
| `sortBy` | string | `'location'`, `'owner'`, `'genre'`, `'title-az'`, `'author-az'` |
| `activeTab` | string | `'library'`, `'reviews'`, or `'stats'` |
| `addOpen` | bool | Controls AddBookModal visibility |
| `scanOpen` | bool | Controls ShelfScanner visibility |
| `transferBook` | object\|null | The book to loan (opens TransferModal) |
| `editBook` | object\|null | The book to edit (opens EditBookModal) |
| `reviewBook` | object\|null | The book to review (opens ReviewModal from library view) |

**Sorting** happens client-side inside `App.jsx` via `useMemo` — the server returns all matching books, the client sorts them. This avoids a round-trip for every sort change.

**Fetching** uses `useCallback` + `useEffect` so `fetchBooks` is only re-created when `filters` changes, and the effect re-runs whenever `fetchBooks` changes.

---

### 4.3 Component Map

```
App.jsx
├── Header.jsx              ← always visible
├── FilterBar.jsx           ← library tab only
├── BookshelfView.jsx       ← library tab only
│   ├── ShelfRow            ← internal: one wooden shelf
│   │   └── BookSpine.jsx   ← one book (vertical, spine view)
│   └── GridView            ← internal: CSS grid of cards
│       └── BookCard.jsx    ← one book (cover + hover overlay)
├── StatsPage.jsx           ← stats tab
├── ReviewsPage.jsx         ← reviews tab
│   └── ReviewModal.jsx     ← inline modal within reviews tab
├── AddBookModal.jsx        ← floating modal (always mounted)
├── EditBookModal.jsx       ← floating modal (always mounted)
├── TransferModal.jsx       ← floating modal (always mounted)
├── ShelfScanner.jsx        ← floating modal (always mounted)
└── ReviewModal.jsx         ← floating modal at App level (from library tab)
```

**Why are modals always mounted?** Framer Motion needs them in the DOM to animate the exit transition. If they were unmounted immediately on close, the closing animation would never play.

#### BookSpine.jsx
Renders a single book as a vertical spine on the shelf. Key details:
- Color is deterministic — derived from `book.id` and first character of `book.title`, so the same book always gets the same color
- The popup (title, author, actions) is rendered via `createPortal` into `document.body` to avoid `overflow: hidden` clipping from parent shelf containers
- On hover, a `spring` animation lifts the book 12px up
- Wrong-location indicator: a 4px orange strip at the very bottom of the spine, `position: absolute` so it never affects layout height

#### BookCard.jsx
Renders a single book as a 2:3 aspect-ratio card in grid view. Key details:
- Hover overlay shows action buttons (transfer, edit, review, delete)
- Wrong-location: 🏠 badge in the top-right corner
- Cover image falls back to a colored placeholder with the first letter of the title

#### BookshelfView.jsx
Decides which view to render and handles grouping:
- **Shelf view**: books are grouped, each group becomes a `ShelfRow` with a wooden plank underneath
- **Grid view**: grouped or flat depending on sort mode
- Grouping uses a `groupBooks()` helper that supports grouping by location, owner, or genre

---

### 4.4 Data Layer (src/data/)

These files contain logic, not UI.

#### `config.js`
Imports `family.config.json` and computes derived values used across many components:

```js
LIBRARY          // { name, subtitle }
OWNERS           // raw array from JSON
REVIEWERS        // raw array from JSON
DEFAULT_OWNER    // name of the isDefault owner
OTHER_OWNER      // name of the isOther owner
OWNER_HOME_MAP   // { "נעם": "בדירה של נעם", "משפחת אברהם": "בית", ... }
REVIEWER_NAMES   // ["נעם", "רוני", ...]
REVIEWER_COLORS  // { "נעם": { bg, text, dot }, ... }
```

#### `members.js`
Two utility functions used by AddBookModal, EditBookModal, TransferModal, and FilterBar:

- `sortedMembers(dbMembers)` — takes the raw DB array and returns it sorted: default owner first, other owner last, rest alphabetically
- `locationOptions()` — returns the list of location strings for dropdowns, derived from each owner's `home` field in config

#### `location.js`
- `expectedHome(owner)` — returns the home location for an owner (from config), or `null` if none defined
- `isWrongLocation(book)` — returns `true` if the book is not at its owner's expected home location

#### `genres.js`
A static array of ~40 book genre strings used in the genre dropdown when adding/editing books.

---

### 4.5 API Client (src/api/index.js)

All `fetch()` calls are centralised here. Every function goes through a shared `request()` helper that:
1. Prepends `/api` to the path
2. Sets `Content-Type: application/json`
3. Throws a proper `Error` if the response is not `ok`
4. Parses and returns the JSON body

```js
api.getBooks(filters)           // GET /api/books?owner=X&status=Y&search=Z
api.addBook(data)               // POST /api/books
api.updateBook(id, data)        // PUT /api/books/:id
api.deleteBook(id)              // DELETE /api/books/:id
api.transferBook(id, data)      // POST /api/books/:id/transfer
api.searchBooks(query)          // GET /api/search?q=...
api.getStats()                  // GET /api/stats
api.scanShelf(base64, mimeType) // POST /api/scan-shelf
api.getFamily()                 // GET /api/family
api.addFamilyMember(name)       // POST /api/family
api.deleteFamilyMember(id)      // DELETE /api/family/:id
api.getReviews(bookId)          // GET /api/reviews?book_id=X
api.getReviewsSummary()         // GET /api/reviews/summary
api.saveReview(data)            // POST /api/reviews
api.deleteReview(id)            // DELETE /api/reviews/:id
```

---

## 5. Configuration System

The goal: one file to edit, everything else updates automatically.

```
family.config.json  (root — the only file a new user edits)
        │
        ├── require('../family.config.json')
        │          backend/db.js
        │          seeds family_members table with owner names
        │
        └── import via Vite alias @familyConfig
                   frontend/src/data/config.js
                   computes derived helpers
                          │
                          ├── members.js  →  AddBookModal, EditBookModal,
                          │                  TransferModal, FilterBar
                          ├── location.js →  BookSpine, BookCard
                          ├── config.js   →  Header, ReviewModal,
                                             ReviewsPage, ShelfScanner
```

The Vite alias is configured in `vite.config.js`:
```js
resolve: {
  alias: {
    '@familyConfig': path.resolve(__dirname, '../family.config.json'),
  },
}
```

This lets any frontend file do `import config from '@familyConfig'` and get the JSON without needing a long relative path like `../../../../family.config.json`.

---

## 6. Data Flow — End to End

### Adding a book

```
User types in AddBookModal search box
    → api.searchBooks(query)
    → GET /api/search?q=query
    → backend calls Google Books + NLI in parallel
    → merges, scores, returns top 40 results
    → user selects a result
    → form pre-filled with book data
    → user picks owner/location/status
    → api.addBook(formData)
    → POST /api/books
    → INSERT INTO books
    → returns new book row
    → App.jsx calls fetchBooks() to reload the list
    → BookshelfView re-renders with the new book
```

### Leaving a review

```
User clicks ⭐ on a BookCard / BookSpine
    → reviewBook state set in App.jsx
    → ReviewModal opens
    → User picks name → rating → optional text
    → api.saveReview({ book_id, user_name, rating, review_text })
    → POST /api/reviews
    → INSERT or UPDATE reviews table (UNIQUE constraint: one row per person per book)
    → ReviewsPage reloads summary + book reviews
    → Reader chip turns coloured with ✓
```

### Wrong-location detection

```
books array loaded in App.jsx
    → passed as props down to BookshelfView → BookCard / BookSpine
    → each card/spine calls isWrongLocation(book)
    → isWrongLocation reads OWNER_HOME_MAP from config
    → compares book.location with expectedHome(book.owner)
    → if mismatch: show 🏠 badge (grid) or orange strip (shelf)
    → tooltip shows "ב[current location] — אמור להיות ב[expected]"
```

---

## Key Libraries

| Library | Used for |
|---|---|
| `express` | HTTP server and routing |
| `sql.js` | SQLite in pure JavaScript (no native binaries needed) |
| `axios` | HTTP requests to Google Books and NLI from the backend |
| `@anthropic-ai/sdk` | Claude AI for the shelf photo scanner |
| `react` + `react-dom` | UI framework |
| `framer-motion` | Animations: shelf hover lift, modal transitions, layout animations |
| `tailwindcss` | Utility CSS classes |
| `vite` | Dev server, bundler, HMR |
| `dotenv` | Loads `.env` file for API keys |
