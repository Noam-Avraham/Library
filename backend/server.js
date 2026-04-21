// LibroFamily backend — ספריית משפחת אברהם
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const rateLimit = require('express-rate-limit');
const { init, run, get, all } = require('./db');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'יותר מדי בקשות — נסה שוב עוד דקה' },
});
app.use('/api/scan-shelf', aiLimiter);
app.use('/api/next-book',  aiLimiter);

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const NLI_API          = 'https://api.nli.org.il/openlibrary/search';
const NLI_HEADERS      = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

// ── NLI helpers ──────────────────────────────────────────────────────────────
const dc = (rec, field) => rec[`http://purl.org/dc/elements/1.1/${field}`]?.[0]?.['@value'] || '';

function cleanAuthor(s) {
  if (!s) return '';
  return s
    .split('$$')[0]                                      // remove NLI authority suffix
    .replace(/,?\s*(?:author|editor|translator|מחבר|עורך|מתרגם|כותב|מאייר|מלחין)(?:\s*,.*)?$/iu, '') // remove role suffix
    .replace(/^(?:מחבר|עורך|מתרגם|כותב)[:\s]+/iu, '')   // remove role prefix
    .replace(/[,(]\s*\d{3,4}\s*[-–]\s*\d{0,4}\s*[,).]?/g, '') // remove year ranges
    .replace(/[,(]\s*\d{3,4}\s*[,).]?\s*$/g, '')        // remove trailing single year
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[,.]$/, '');
}

// Keep for title cleaning (still needed)
function cleanNLIName(s) { return cleanAuthor(s); }

function cleanGenre(categories) {
  if (!categories?.length) return '';
  // Take the most specific (last) part of the first category path, e.g.:
  // "Juvenile Fiction / Fantasy & Magic / General" → "Fantasy & Magic"
  const first = categories[0];
  const parts  = first.split('/').map(s => s.trim()).filter(Boolean);
  // Skip generic parts like "General", "Fiction" alone if there's something more specific
  const meaningful = parts.filter(p => p.toLowerCase() !== 'general');
  return meaningful[meaningful.length - 1] || parts[0] || '';
}

function cleanNLITitle(s) {
  // "Book Title / Author ; מאנגלית - Translator" → "Book Title"
  return (s.split(' / ')[0] || s).trim().replace(/\.\s*$/, '');
}

function parseTranslator(rawTitle) {
  const m = /;\s*(?:מאנגלית|מרוסית|מצרפתית|מגרמנית|מספרדית|מאיטלקית|מפולנית|מערבית|מיפנית|מסינית|תרגום)\s*[-:]\s*([^;.]+)/i.exec(rawTitle);
  return m ? m[1].trim().replace(/\.\s*$/, '') : '';
}

function parseNLIRecord(rec) {
  const rawTitle   = dc(rec, 'title');
  const title      = cleanNLITitle(rawTitle);
  const author     = cleanNLIName(dc(rec, 'creator'));
  const translator = parseTranslator(rawTitle) || cleanNLIName(dc(rec, 'contributor'));
  const isbn       = dc(rec, 'isbn').replace(/[^0-9X]/g, '');
  const thumbnail  = dc(rec, 'thumbnail') ||
    (dc(rec, 'isbn').replace(/[^0-9X]/g, '')
      ? `https://covers.openlibrary.org/b/isbn/${dc(rec, 'isbn').replace(/[^0-9X]/g, '')}-M.jpg`
      : '');
  const date       = dc(rec, 'date');
  const lang       = dc(rec, 'language');
  const publisher  = dc(rec, 'publisher').replace(/^[^:]+:\s*/, '').replace(/,\s*$/, '').trim();
  const recordId   = dc(rec, 'recordid');

  return {
    googleId:     `nli_${recordId}`,
    title,
    author,
    translator:   translator !== author ? translator : '',
    thumbnailUrl: thumbnail,
    isbn,
    genre:        '',
    description:  '',
    publisher,
    publishedDate: date ? date.slice(0, 4) : '',
    language:     lang,
    source:       'nli',
  };
}

async function fetchNLI(q) {
  const key = process.env.NLI_API_KEY;
  if (!key) return [];
  const isISBN = /^[\d-]{10,17}$/.test(q.replace(/\s/g, ''));
  const query  = isISBN ? `isbn,exact,${q.replace(/[^0-9X]/g, '')}` : `title,contains,${q}`;
  const params = new URLSearchParams({ api_key: key, query, output_format: 'json', limit: 20 });
  const { data } = await axios.get(`${NLI_API}?${params}`, { headers: NLI_HEADERS, timeout: 6000 });
  const records  = Array.isArray(data) ? data : [];
  return records
    .filter(r => dc(r, 'type') === 'book' || dc(r, 'title'))
    .map(parseNLIRecord)
    .filter(b => b.title);
}

async function fetchGoogle(q) {
  const key    = process.env.GOOGLE_BOOKS_API_KEY;
  const params = new URLSearchParams({ q, maxResults: 20, orderBy: 'relevance', printType: 'books' });
  if (key) params.set('key', key);
  const { data } = await axios.get(`${GOOGLE_BOOKS_API}?${params}`, { timeout: 6000 });
  return (data.items || []).map(item => {
    const info  = item.volumeInfo;
    const thumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
    const isbn  =
      (info.industryIdentifiers || []).find(i => i.type === 'ISBN_13')?.identifier ||
      (info.industryIdentifiers || []).find(i => i.type === 'ISBN_10')?.identifier || '';
    return {
      googleId:     item.id,
      title:        info.title || '',
      author:       (info.authors || []).map(cleanAuthor).join(', '),
      translator:   '',
      thumbnailUrl: thumb
        ? thumb.replace(/^http:\/\//, 'https://')
        : (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg` : ''),
      isbn,
      genre:        cleanGenre(info.categories),
      description:  info.description || '',
      publisher:    info.publisher || '',
      publishedDate: info.publishedDate || '',
      pageCount:    info.pageCount || 0,
      language:     info.language || '',
      source:       'google',
    };
  });
}

// ── Ranking ──────────────────────────────────────────────────────────────────
const isHebrew = s => /[\u0590-\u05FF]/.test(s);

function scoreResult(book, query) {
  let score = 0;
  const q     = query.toLowerCase();
  const title = (book.title || '').toLowerCase();

  // Title match
  if (title === q)              score += 100;
  else if (title.startsWith(q)) score += 70;
  else if (title.includes(q))   score += 40;

  // Language match
  const hebrewQuery = isHebrew(query);
  if (hebrewQuery  && book.language === 'heb') score += 25;
  if (!hebrewQuery && book.language === 'eng') score += 15;

  // Data completeness
  if (book.thumbnailUrl) score += 15;
  if (book.author)       score += 10;
  if (book.isbn)         score +=  5;
  if (book.translator)   score +=  5;
  if (book.publishedDate) score += 3;

  return score;
}

// ── Unified Search (NLI + Google in parallel) ────────────────────────────────
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const [nliRes, googleRes] = await Promise.allSettled([fetchNLI(q), fetchGoogle(q)]);

  const nliBooks    = nliRes.status    === 'fulfilled' ? nliRes.value    : [];
  const googleBooks = googleRes.status === 'fulfilled' ? googleRes.value : [];

  // Merge: for same ISBN keep NLI data but patch thumbnail from Google if missing
  const merged   = [...nliBooks];
  const nliIsbns = new Set(nliBooks.map(b => b.isbn).filter(Boolean));

  for (const g of googleBooks) {
    if (g.isbn && nliIsbns.has(g.isbn)) {
      const idx = merged.findIndex(b => b.isbn === g.isbn);
      if (idx >= 0 && !merged[idx].thumbnailUrl && g.thumbnailUrl)
        merged[idx].thumbnailUrl = g.thumbnailUrl;
    } else {
      merged.push(g);
    }
  }

  // Score every result
  const scored = merged.map(b => ({ ...b, _score: scoreResult(b, q) }));

  // Pick best from each source as featured (shown first)
  const bestNLI    = [...scored].filter(b => b.source === 'nli')   .sort((a,b) => b._score - a._score)[0];
  const bestGoogle = [...scored].filter(b => b.source === 'google').sort((a,b) => b._score - a._score)[0];

  const featuredIds = new Set([bestNLI?.googleId, bestGoogle?.googleId].filter(Boolean));
  const featured    = [bestNLI, bestGoogle].filter(Boolean);
  const rest        = scored
    .filter(b => !featuredIds.has(b.googleId))
    .sort((a, b) => b._score - a._score);

  const results = [...featured, ...rest]
    .slice(0, 40)
    .map(({ _score, ...b }) => b);   // strip internal score field

  res.json(results);
});

// ── Books CRUD ───────────────────────────────────────────────────────────────
app.get('/api/books', (req, res) => {
  const { owner, status, search } = req.query;
  let sql = 'SELECT * FROM books WHERE 1=1';
  const params = [];

  if (owner)  { sql += ' AND owner = ?';                          params.push(owner); }
  if (status) { sql += ' AND status = ?';                         params.push(status); }
  if (search) { sql += ' AND (title LIKE ? OR author LIKE ?)';    params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY id DESC';
  res.json(all(sql, params));
});

app.post('/api/books', (req, res) => {
  const { title, author, translator, thumbnailUrl, isbn, owner, current_holder, location, status, genre, description } = req.body;
  const id = run(
    `INSERT INTO books (title, author, translator, thumbnailUrl, isbn, owner, current_holder, location, status, genre, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, author || '', translator || '', thumbnailUrl || '', isbn || '',
     owner || '', current_holder || owner || '',
     location || 'בית', status || 'זמין', genre || '', description || '']
  );
  res.status(201).json(get('SELECT * FROM books WHERE id = ?', [id]));
});

app.put('/api/books/:id', (req, res) => {
  const { title, author, translator, thumbnailUrl, isbn, owner, current_holder, location, status, genre, description } = req.body;
  run(
    `UPDATE books SET title=?, author=?, translator=?, thumbnailUrl=?, isbn=?, owner=?, current_holder=?, location=?, status=?, genre=?, description=?
     WHERE id=?`,
    [title, author, translator || '', thumbnailUrl, isbn, owner, current_holder, location, status, genre, description, req.params.id]
  );
  res.json(get('SELECT * FROM books WHERE id = ?', [Number(req.params.id)]));
});

app.delete('/api/books/:id', (req, res) => {
  run('DELETE FROM books WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

app.post('/api/books/:id/transfer', (req, res) => {
  const { current_holder, status, location } = req.body;
  run('UPDATE books SET current_holder=?, status=?, location=? WHERE id=?',
    [current_holder, status || 'מושאל', location || 'בית', Number(req.params.id)]);
  res.json(get('SELECT * FROM books WHERE id = ?', [Number(req.params.id)]));
});

// ── Family Members ───────────────────────────────────────────────────────────
app.get('/api/family', (req, res) => {
  res.json(all('SELECT * FROM family_members ORDER BY name'));
});

app.get('/api/locations', (req, res) => {
  res.json(all('SELECT DISTINCT location FROM books WHERE location IS NOT NULL AND location != \'\' ORDER BY location').map(r => r.location));
});

app.post('/api/family', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = run('INSERT OR IGNORE INTO family_members (name) VALUES (?)', [name.trim()]);
  res.status(201).json({ id, name: name.trim() });
});

app.delete('/api/family/:id', (req, res) => {
  run('DELETE FROM family_members WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

// ── Reviews ──────────────────────────────────────────────────────────────────
app.get('/api/reviews', (req, res) => {
  const { book_id } = req.query;
  if (book_id) {
    return res.json(all('SELECT * FROM reviews WHERE book_id = ? ORDER BY created_at DESC', [Number(book_id)]));
  }
  res.json(all('SELECT * FROM reviews ORDER BY created_at DESC'));
});

// Summary: for each book, avg rating + who read it
app.get('/api/reviews/summary', (req, res) => {
  const rows = all(`
    SELECT book_id,
           COUNT(*) as read_count,
           AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
           GROUP_CONCAT(user_name, ',') as readers,
           MAX(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) as has_rating,
           MAX(CASE WHEN review_text IS NOT NULL AND review_text != '' THEN 1 ELSE 0 END) as has_review
    FROM reviews
    WHERE is_read = 1
    GROUP BY book_id
  `);
  res.json(rows);
});

app.post('/api/reviews', (req, res) => {
  const { book_id, user_name, rating, review_text } = req.body;
  if (!book_id || !user_name) return res.status(400).json({ error: 'book_id and user_name required' });

  const existing = get('SELECT id FROM reviews WHERE book_id = ? AND user_name = ?', [Number(book_id), user_name]);
  if (existing) {
    run(
      'UPDATE reviews SET rating = ?, review_text = ?, is_read = 1 WHERE book_id = ? AND user_name = ?',
      [rating ?? null, review_text || '', Number(book_id), user_name]
    );
    return res.json(get('SELECT * FROM reviews WHERE book_id = ? AND user_name = ?', [Number(book_id), user_name]));
  }

  const id = run(
    'INSERT INTO reviews (book_id, user_name, rating, review_text, is_read) VALUES (?, ?, ?, ?, 1)',
    [Number(book_id), user_name, rating ?? null, review_text || '']
  );
  res.status(201).json(get('SELECT * FROM reviews WHERE id = ?', [id]));
});

app.delete('/api/reviews/:id', (req, res) => {
  run('DELETE FROM reviews WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

// ── Statistics ───────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const total       = get('SELECT COUNT(*) as c FROM books')?.c || 0;
  const byStatus    = all('SELECT status, COUNT(*) as count FROM books GROUP BY status ORDER BY count DESC');
  const byOwner     = all('SELECT owner, COUNT(*) as count FROM books GROUP BY owner ORDER BY count DESC');
  const byLocation  = all('SELECT location, COUNT(*) as count FROM books GROUP BY location ORDER BY count DESC');
  const byGenre     = all("SELECT genre, COUNT(*) as count FROM books WHERE genre != '' GROUP BY genre ORDER BY count DESC LIMIT 12");
  const onLoan      = all("SELECT * FROM books WHERE status = 'מושאל' ORDER BY id DESC");
  const wishlist    = all("SELECT * FROM books WHERE status = 'רשימת משאלות' ORDER BY id DESC");
  const recent      = all('SELECT * FROM books ORDER BY id DESC LIMIT 8');
  res.json({ total, byStatus, byOwner, byLocation, byGenre, onLoan, wishlist, recent });
});

// ── Next Book Recommendation ─────────────────────────────────────────────────
app.get('/api/next-book', async (req, res) => {
  const { user_name, mode = 'library' } = req.query;
  if (!user_name) return res.status(400).json({ error: 'user_name required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const readBooks = all(`
    SELECT b.title, b.author, b.genre, r.rating, r.review_text
    FROM reviews r JOIN books b ON r.book_id = b.id
    WHERE r.user_name = ? AND r.is_read = 1
    ORDER BY r.rating DESC NULLS LAST
  `, [user_name]);

  if (readBooks.length === 0)
    return res.json({ recommendations: [], reason: 'no_history' });

  if (readBooks.every(b => !b.rating))
    return res.json({ recommendations: [], reason: 'no_ratings' });

  const readList = readBooks.map(b =>
    `- "${b.title}"${b.author ? ` / ${b.author}` : ''}${b.genre ? ` [${b.genre}]` : ''}${b.rating ? ` — ${b.rating}/5` : ''}${b.review_text ? `: "${b.review_text}"` : ''}`
  ).join('\n');

  const client = new Anthropic({ apiKey });

  // ── External mode: recommend books outside the library ──────────────────────
  if (mode === 'external') {
    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You are a personal librarian. Based on this person's reading history, recommend 5 books they don't own yet that they would love.

BOOKS THIS PERSON HAS READ:
${readList}

Return ONLY a JSON array, no other text:
[{"title": "...", "author": "...", "original_title": "...", "reason": "<one sentence in Hebrew explaining why they'd enjoy it>"}]

Rules:
- Recommend ONLY books that have an official published Hebrew translation (not just "could be translated")
- "title" = the Hebrew title as published in Israel
- "original_title" = the original title in its original language (use this if the book was not originally in Hebrew)
- Only include books you are highly confident exist in Hebrew translation
- Return exactly 5.`,
        }],
      });

      const raw = message.content[0]?.text || '[]';
      const match = raw.match(/\[[\s\S]*\]/);
      const picks = match ? JSON.parse(match[0]) : [];

      // Enrich each recommendation with cover/ISBN from Google Books + NLI
      // Search by original_title (more reliable) then fall back to Hebrew title
      const enriched = await Promise.all(
        picks.map(async pick => {
          const searchQuery = [pick.title, pick.author].filter(Boolean).join(' ');
          try {
            const [nliRes, googleRes] = await Promise.allSettled([fetchNLI(searchQuery), fetchGoogle(searchQuery)]);
            const nliBooks    = nliRes.status    === 'fulfilled' ? nliRes.value    : [];
            const googleBooks = googleRes.status === 'fulfilled' ? googleRes.value : [];
            const merged = [...nliBooks];
            const nliIsbns = new Set(nliBooks.map(b => b.isbn).filter(Boolean));
            for (const g of googleBooks) {
              if (g.isbn && nliIsbns.has(g.isbn)) {
                const idx = merged.findIndex(b => b.isbn === g.isbn);
                if (idx >= 0 && !merged[idx].thumbnailUrl && g.thumbnailUrl)
                  merged[idx].thumbnailUrl = g.thumbnailUrl;
              } else {
                merged.push(g);
              }
            }
            if (merged.length === 0) return null; // API couldn't find it — likely hallucinated
            const best = merged.sort((a, b) => scoreResult(b, pick.title) - scoreResult(a, pick.title))[0];
            return {
              title:        best?.title        || pick.title,
              author:       best?.author       || pick.author,
              thumbnailUrl: best?.thumbnailUrl || '',
              isbn:         best?.isbn         || '',
              genre:        best?.genre        || '',
              reason:       pick.reason,
            };
          } catch {
            return null;
          }
        })
      );
      const recommendations = enriched.filter(Boolean);

      return res.json({ recommendations, reason: 'ok', mode: 'external' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Library mode: recommend from unread books in the library ─────────────────
  const unreadBooks = all(`
    SELECT b.id, b.title, b.author, b.genre, b.thumbnailUrl
    FROM books b
    WHERE b.id NOT IN (
      SELECT book_id FROM reviews WHERE user_name = ? AND is_read = 1
    )
    AND b.status != 'רשימת משאלות'
  `, [user_name]);

  if (unreadBooks.length === 0)
    return res.json({ recommendations: [], reason: 'all_read' });

  const unreadList = unreadBooks.map((b, i) =>
    `${i}: "${b.title}"${b.author ? ` / ${b.author}` : ''}${b.genre ? ` [${b.genre}]` : ''}`
  ).join('\n');

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a personal librarian. Based on the reading history below, recommend up to 5 books from the available list that this reader would enjoy most.

BOOKS THIS PERSON HAS READ (with ratings and reviews):
${readList}

AVAILABLE UNREAD BOOKS (with index numbers):
${unreadList}

Return ONLY a JSON array, no other text:
[{"index": <number from available list>, "reason": "<one sentence in Hebrew explaining why they'd enjoy it>"}]

Pick the best matches based on genres, authors, themes, and their ratings/reviews. Recommend ONLY books originally written in Hebrew or widely available in Hebrew translation. Return at most 5.`,
      }],
    });

    const raw = message.content[0]?.text || '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    const picks = match ? JSON.parse(match[0]) : [];
    const recommendations = picks
      .filter(p => p.index >= 0 && p.index < unreadBooks.length)
      .map(p => ({ ...unreadBooks[p.index], reason: p.reason }));

    res.json({ recommendations, reason: 'ok', mode: 'library' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Shelf Photo Scanner ──────────────────────────────────────────────────────
app.post('/api/scan-shelf', async (req, res) => {
  const { imageBase64, mediaType = 'image/jpeg' } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });
  if (imageBase64.length > 15_000_000) return res.status(400).json({ error: 'התמונה גדולה מדי — מקסימום 20MB' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const client = new Anthropic({ apiKey });

  // Step 1: Ask Claude to identify every book spine in the photo
  let identified = [];
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      tools: [{
        name: 'report_books',
        description: 'Report all books identified on the shelf',
        input_schema: {
          type: 'object',
          properties: {
            books: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title:  { type: 'string', description: 'Book title as it appears on the spine' },
                  author: { type: 'string', description: 'Author name, or empty string if not visible' },
                },
                required: ['title', 'author'],
              },
            },
          },
          required: ['books'],
        },
      }],
      tool_choice: { type: 'tool', name: 'report_books' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `You are an expert librarian and OCR specialist analyzing a photo of a bookshelf.

Your task: identify EVERY book spine visible in the image and extract the title and author.

Instructions:
- Scan left-to-right, top-to-bottom across ALL shelves in the image
- Book spines are usually vertical — tilt your reading mentally to read rotated text
- Hebrew text reads right-to-left; English text reads left-to-right
- For Hebrew books: the title is usually larger, the author below or above it
- Include books that are partially visible or have faded text — give your best reading
- If you can only read the title but not the author, include the book with an empty author
- Do NOT skip books just because the text is small or the angle is awkward
- Report the text exactly as printed — do not translate or correct spelling
- If a spine has both Hebrew and English text, prefer the Hebrew title`,
          },
        ],
      }],
    });

    const toolUse = message.content.find(b => b.type === 'tool_use');
    identified = toolUse?.input?.books ?? [];
  } catch (err) {
    return res.status(500).json({ error: `Claude error: ${err.message}` });
  }

  // Step 2: Search NLI + Google for each identified book
  const results = await Promise.all(
    identified.map(async ({ title, author }) => {
      const query = [title, author].filter(Boolean).join(' ');
      try {
        const [nliRes, googleRes] = await Promise.allSettled([fetchNLI(query), fetchGoogle(query)]);
        const nliBooks    = nliRes.status    === 'fulfilled' ? nliRes.value    : [];
        const googleBooks = googleRes.status === 'fulfilled' ? googleRes.value : [];

        const merged   = [...nliBooks];
        const nliIsbns = new Set(nliBooks.map(b => b.isbn).filter(Boolean));
        for (const g of googleBooks) {
          if (g.isbn && nliIsbns.has(g.isbn)) {
            const idx = merged.findIndex(b => b.isbn === g.isbn);
            if (idx >= 0 && !merged[idx].thumbnailUrl && g.thumbnailUrl)
              merged[idx].thumbnailUrl = g.thumbnailUrl;
          } else {
            merged.push(g);
          }
        }

        const scored = merged
          .map(b => ({ ...b, _score: scoreResult(b, title) }))
          .sort((a, b) => b._score - a._score)
          .slice(0, 5)
          .map(({ _score, ...b }) => b);

        return { identified: { title, author }, matches: scored };
      } catch {
        return { identified: { title, author }, matches: [] };
      }
    })
  );

  res.json(results);
});

// ── Start (after DB init) ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n📚 LibroFamily backend running on http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
