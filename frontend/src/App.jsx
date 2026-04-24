import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './api/index.js';
import Header from './components/Header.jsx';
import FilterBar from './components/FilterBar.jsx';
import BookshelfView from './components/BookshelfView.jsx';
import AddBookModal from './components/AddBookModal.jsx';
import TransferModal from './components/TransferModal.jsx';
import EditBookModal from './components/EditBookModal.jsx';
import StatsPage from './components/StatsPage.jsx';
import ReviewsPage from './components/ReviewsPage.jsx';
import ReviewModal from './components/ReviewModal.jsx';
import BookReviewsModal from './components/BookReviewsModal.jsx';
import NextBookModal from './components/NextBookModal.jsx';
import ShelfScanner from './components/ShelfScanner.jsx';
import LoansList from './components/LoansList.jsx';

const QUOTES = [
  { text: 'אם תאכל שלוש ארוחות ביום תהיה שמן. אם תקרא שלושה ספרים ביום תהיה חכם.', author: 'שמעון פרס' },
  { text: 'ישנם ספרים שהחלק הטוב ביותר שלהם הוא בכריכתם.', author: "צ'ארלס דיקנס" },
  { text: 'יש ספרים שדפי העטיפה שלהם הם הטובים ביותר שבהם.', author: 'מארק טוויין' },
  { text: 'ספרים הם מגפה אנושית. תשע עשיריות של הספרים הם טיפשיים, והספרים הטובים מפריכים את הרעים.', author: "בנימין ד'יזראלי" },
  { text: 'לעולם אל תשאיל ספרים. איש אינו מחזיר אותם. הספרים שיש לי בספרייתי הם אלה שאנשים השאילו לי.', author: 'אנטול פרנס' },
];
const QUOTE = QUOTES[Math.floor(Math.random() * QUOTES.length)];

const INITIAL_FILTERS = { search: '', owner: '', status: '' };

export default function App() {
  const [books, setBooks]               = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [filters, setFilters]           = useState(INITIAL_FILTERS);
  const [loading, setLoading]           = useState(true);
  const [viewMode, setViewMode]         = useState('shelf');
  const [sortBy,   setSortBy]           = useState('location');
  const [activeTab, setActiveTab]       = useState('library');

  const [addOpen,       setAddOpen]       = useState(false);
  const [scanOpen,      setScanOpen]      = useState(false);
  const [transferBook,  setTransferBook]  = useState(null);
  const [editBook,      setEditBook]      = useState(null);
  const [reviewBook,    setReviewBook]    = useState(null);
  const [viewReviewsBook, setViewReviewsBook] = useState(null);
  const [nextBookOpen,  setNextBookOpen]  = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      setBooks(await api.getBooks(filters));
    } catch (err) {
      console.error('fetchBooks error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  useEffect(() => {
    api.getFamily().then(setFamilyMembers).catch(console.error);
  }, []);

  // ── Client-side sort + hide borrowed books from normal shelf ─────────────────
  const sortedBooks = useMemo(() => {
    const arr = [...books];
    switch (sortBy) {
      case 'title-az':
        arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'he'));
        break;
      case 'author-az':
        arr.sort((a, b) => (a.author || '').localeCompare(b.author || '', 'he'));
        break;
      case 'owner':
        arr.sort((a, b) => (a.owner || '').localeCompare(b.owner || '', 'he') || (a.title || '').localeCompare(b.title || '', 'he'));
        break;
      case 'genre':
        arr.sort((a, b) => (a.genre || 'ת').localeCompare(b.genre || 'ת', 'he') || (a.title || '').localeCompare(b.title || '', 'he'));
        break;
      default: // location — sort within each group by title
        arr.sort((a, b) => (a.location || 'בית').localeCompare(b.location || 'בית', 'he') || (a.title || '').localeCompare(b.title || '', 'he'));
    }
    return arr;
  }, [books, sortBy]);


  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFilterChange = (key, value) => setFilters(f => ({ ...f, [key]: value }));

  // After add: reload from server so the new book is in the right shelf
  const handleAddBook = async (data) => {
    await api.addBook(data);
    await fetchBooks();
  };

  const handleTransferBook = async (id, data) => {
    const updated = await api.transferBook(id, data);
    setBooks(prev => prev.map(b => b.id === id ? updated : b));
  };

  const handleUpdateBook = async (id, data) => {
    const updated = await api.updateBook(id, data);
    setBooks(prev => prev.map(b => b.id === id ? updated : b));
  };

  const handleDeleteBook = async (id) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק ספר זה?')) return;
    await api.deleteBook(id);
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5e6cc' }}>
      <Header
        onAddClick={() => setAddOpen(true)}
        onScanClick={() => setScanOpen(true)}
        onNextBookClick={() => setNextBookOpen(true)}
        bookCount={books.length}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'stats'   && <StatsPage />}
      {activeTab === 'reviews' && <ReviewsPage />}

      {activeTab === 'library' && <>
        <FilterBar
          filters={filters}
          familyMembers={familyMembers}
          onChange={handleFilterChange}
          onReset={() => setFilters(INITIAL_FILTERS)}
          viewMode={viewMode}
          onViewChange={mode => {
            setViewMode(mode);
            if (mode === 'grid' && sortBy === 'location') setSortBy('title-az');
          }}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        <main className="max-w-7xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
          {filters.status === 'מושאל' && <LoansList books={sortedBooks} />}
          <BookshelfView
            books={sortedBooks}
            statusFilter={filters.status}
            loading={loading}
            viewMode={viewMode}
            sortBy={sortBy}
            filters={filters}
            onTransfer={setTransferBook}
            onDelete={handleDeleteBook}
            onEdit={setEditBook}
            onReview={setViewReviewsBook}
          />
        </main>
      </>}

      {/* Quote footer */}
      <footer className="text-center py-8 px-4" dir="rtl">
        <p className="text-sm italic" style={{ color: '#8B5E3C' }}>"{QUOTE.text}"</p>
        <p className="text-xs mt-1 font-semibold" style={{ color: '#6B3F20' }}>~ {QUOTE.author}</p>
        <p className="mt-4" style={{ color: '#b8956a', fontSize: '0.6rem', lineHeight: '1.6' }}>
          האתר נוצר ע״י נעם אברהם · התמונות נלקחו ממקורות מידע חופשיים כגון ויקיפדיה ומאגר המידע של הספרייה הלאומית · במידה וישנה הפרה של זכויות יוצרים באתר זה נא לפנות ליוצר האתר
        </p>
      </footer>

      <ShelfScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        familyMembers={familyMembers}
        onBulkAdd={fetchBooks}
      />

      {/* Modals — always mounted so they can animate out */}
      <AddBookModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        familyMembers={familyMembers}
        onAdd={handleAddBook}
      />
      <TransferModal
        open={!!transferBook}
        book={transferBook}
        familyMembers={familyMembers}
        onClose={() => setTransferBook(null)}
        onTransfer={handleTransferBook}
      />
      <EditBookModal
        open={!!editBook}
        book={editBook}
        familyMembers={familyMembers}
        onClose={() => setEditBook(null)}
        onSave={handleUpdateBook}
      />
      <NextBookModal open={nextBookOpen} onClose={() => setNextBookOpen(false)} />
      <BookReviewsModal
        open={!!viewReviewsBook}
        book={viewReviewsBook}
        onClose={() => setViewReviewsBook(null)}
        onAddReview={book => { setViewReviewsBook(null); setReviewBook(book); }}
      />
      <ReviewModal
        open={!!reviewBook}
        book={reviewBook}
        existingReview={null}
        onClose={() => setReviewBook(null)}
        onSaved={() => setReviewBook(null)}
      />
    </div>
  );
}
