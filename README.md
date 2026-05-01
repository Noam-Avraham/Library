# 📚 Family Library App

A full-stack web app for managing a family book collection — track ownership, location, loans, and reading reviews.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Shelf view** | Visual bookshelf with 3D spines, grouped by location / owner / genre |
| **Grid view** | Cover-art grid with hover actions |
| **Book search** | Searches Google Books + Israeli National Library simultaneously |
| **Shelf scanner** | Upload a photo of a bookshelf — AI identifies the books automatically |
| **Loans** | Transfer books between family members; active loans list shows borrower and days elapsed |
| **Wishlist** | Books with "wishlist" status get their own shelf and can't be assigned a location |
| **Reviews** | Each person can mark a book as read, rate 1–5 stars, and write a review |
| **Translator field** | Books can store a translator name alongside author |
| **Wrong-location indicator** | Orange stripe on a book's spine when it's not at the owner's home |
| **Statistics** | Charts for collection breakdown by owner, genre, status |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later

### 1. Clone / download the project

```
git clone <repo-url>
cd AvrahamLibrary
```

### 2. Personalise for your family

Open **`family.config.json`** in the project root and edit it — this is the **only file you need to change**:

```json
{
  "library": {
    "name":     "ספריית משפחת שלך",
    "subtitle": "ניהול ספרי המשפחה"
  },
  "owners": [
    { "name": "כולם",   "home": "בית",          "isDefault": true  },
    { "name": "דני",    "home": "בדירה של דני"                     },
    { "name": "מיכל",   "home": "בדירה של מיכל"                    },
    { "name": "אחר",    "home": null,            "isOther":  true  }
  ],
  "reviewers": [
    { "name": "דני",   "color": { "bg": "#dbeafe", "text": "#1d4ed8", "dot": "#3b82f6" } },
    { "name": "מיכל",  "color": { "bg": "#fce7f3", "text": "#be185d", "dot": "#ec4899" } }
  ]
}
```

**`owners`** — people/groups who own books:
- `name` — display name used everywhere in the app
- `home` — where their books normally live (used for the wrong-location indicator). Set to `null` to skip the check.
- `isDefault: true` — the shared / catch-all owner shown first in dropdowns (exactly one)
- `isOther: true` — the "other / unknown" fallback shown last in dropdowns (exactly one)

**`reviewers`** — people who can leave reviews and mark books as read:
- `name` — must match an owner name or be any name you like
- `color.bg` — chip background color (light pastel works best)
- `color.text` — chip text color
- `color.dot` — accent dot color

> Reviewer color picker: [coolors.co](https://coolors.co) or [tailwindcss.com/docs/customizing-colors](https://tailwindcss.com/docs/customizing-colors)

### 3. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. (Optional) API keys

Create `backend/.env` for enhanced book search:

```
GOOGLE_BOOKS_API_KEY=your_key_here
NLI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

- **Google Books** — free key from [console.cloud.google.com](https://console.cloud.google.com)
- **NLI** (Israeli National Library) — improves Hebrew book search
- **Anthropic** — required for AI book recommendations
- **Gemini** — required for the shelf scanner (Google AI Studio or Google Cloud Console)

The app works without any keys (uses unauthenticated Google Books quota).

### 5. Run

Open **two terminals**:

```bash
# Terminal 1 — backend (runs on port 3001)
cd backend
node server.js
```

```bash
# Terminal 2 — frontend (runs on port 5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🗂 Project Structure

```
AvrahamLibrary/
├── family.config.json          ← ✏️  Edit this to personalise
├── backend/
│   ├── server.js               ← Express API
│   ├── db.js                   ← SQLite via sql.js
│   └── library.db              ← Database file (auto-created)
└── frontend/
    ├── src/
    │   ├── data/
    │   │   ├── config.js       ← Derived helpers (do not edit)
    │   │   ├── members.js      ← Shared sortedMembers / locationOptions
    │   │   └── location.js     ← Wrong-location detection
    │   ├── components/         ← React UI components
    │   └── api/index.js        ← API client
    └── vite.config.js
```

---

## 🔧 Customisation Tips

**Add or remove family members on a running library**
Run the interactive management script on the server:
```bash
node backend/manage-family.js
```
It lists current members, lets you add or remove by name, and writes directly to `library.db`. No restart needed.

**Add more reviewers**
Add a new entry to `reviewers`. Pick a unique color from the palette above.

**Change the app language**
UI text strings are in the component files. The app is currently in Hebrew (RTL). To change direction, update `dir="rtl"` attributes and `localeCompare('he')` calls.

**Change the shelf plank color**
Edit the `background` in `BookshelfView.jsx` → `ShelfRow` → the `Wooden plank` div.

---

## 🤖 AI Features

The app uses the Anthropic Claude API for two features. Claude has no access to the server, database, or any files — it only receives the specific data sent to it in each request.

### Book Recommendations (`/api/next-book`)

Two modes, same endpoint:

| | Library mode | External mode |
|---|---|---|
| **Claude receives** | Reading history (titles, authors, genres, ratings, reviews) + numbered list of unread books in the library | Reading history only |
| **Claude returns** | Index numbers pointing into the unread list | New book suggestions (title, author, reason in Hebrew) |
| **Book data source** | Always from the database — never from Claude's response | Verified via Google Books + NLI APIs |

### Shelf Scanner — two-phase flow

**Phase 1 — Identify (`/api/scan-identify`):**

| | |
|---|---|
| **Gemini receives** | The photo (as base64) + English instruction prompt |
| **Gemini returns** | A JSON list of `{ title, author, language, confidence }` pairs — immediately |

**Phase 2 — Enrich (`/api/scan-enrich`, called per book in background):**

| | |
|---|---|
| **Input** | `{ title, author }` for one book |
| **Searches** | NLI + Google Books **by title only** (author name transliterations cause false negatives in queries) |
| **Scores** | `scoreResult()`: title match primary (exact=100/startsWith=70/includes=40), author secondary (+25/+12), metadata capped as tiebreaker (~11pts max) |
| **Returns** | Top 5 catalog matches with `matchScore`, thumbnail, ISBN, and `source` label |

The UI shows two side-by-side panels per book: what Gemini read (📷) and the best catalog match (📚). The user can edit an identified title or author and press **עדכן** to re-search, or press ✕ to dismiss a wrong identification. Confidence level (high / medium / low) is shown per Gemini identification.

The AI prompt is versioned in `backend/scanner-prompt-versions.md` to track improvements over time.

### Security

| Threat | Protection |
|---|---|
| **Prompt injection via book data** | All DB fields (title, author, genre, review text) are sanitized before entering the prompt: newlines stripped, length capped at 200 chars |
| **Library-mode injection** | Claude only returns an index number, not book details. The actual book always comes from the DB. A bounds check rejects any out-of-range index. |
| **Malicious `mediaType`** | Validated against a whitelist (`image/jpeg`, `image/png`, `image/gif`, `image/webp`) — anything else is rejected with 400 |
| **SQL injection** | All database queries use parameterized statements (`?` placeholders) — user input is never interpreted as SQL |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express |
| Database | SQLite via sql.js (no installation needed) |
| Book search | Google Books API + Israeli National Library API |
| AI scanner | Google Gemini 2.5 Flash (vision) |
| AI recommendations | Anthropic Claude |

---

## 📝 License

MIT — free to use and modify for personal projects.
