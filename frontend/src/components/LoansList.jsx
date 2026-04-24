function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return null;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - date) / 86400000);
  const label = diffDays === 0 ? 'היום'
    : diffDays === 1 ? 'אתמול'
    : `לפני ${diffDays} ימים`;
  return { formatted: `${d}/${m}/${y.slice(2)}`, label };
}

export default function LoansList({ books }) {
  const loans = books.filter(b => b.status === 'מושאל');
  if (loans.length === 0) return null;

  return (
    <div className="mb-6 bg-white border border-orange-100 shadow-sm" dir="rtl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-orange-100 bg-orange-50">
        <span className="text-orange-500 text-base">📋</span>
        <h2 className="font-bold text-sm text-gray-800">רשימת השאלות</h2>
        <span className="text-xs text-orange-600 font-medium bg-orange-100 px-2 py-0.5 rounded-full">
          {loans.length}
        </span>
      </div>

      <ul className="divide-y divide-gray-100">
        {loans.map(book => {
          const date = formatDate(book.borrowed_at);
          return (
            <li key={book.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/50 transition-colors">
              {book.thumbnailUrl
                ? <img src={book.thumbnailUrl} alt="" className="w-8 h-11 object-cover shadow flex-shrink-0" />
                : <div className="w-8 h-11 bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow">
                    <span className="text-white text-xs font-bold">{book.title?.charAt(0)}</span>
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{book.title}</p>
                {book.author && <p className="text-xs text-gray-400 truncate">{book.author}</p>}
              </div>
              <div className="text-right flex-shrink-0 space-y-0.5">
                <p className="text-sm font-medium text-orange-700">{book.current_holder}</p>
                {date
                  ? <p className="text-xs text-gray-400">{date.formatted} · {date.label}</p>
                  : <p className="text-xs text-gray-300">ללא תאריך</p>
                }
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
