import { sortedMembers } from '../data/members.js';
import { STATUSES } from '../data/statuses.js';

const SORT_OPTIONS = [
  { value: 'location',  label: '📍 לפי מיקום'  },
  { value: 'owner',     label: '👤 לפי בעלים'   },
  { value: 'genre',     label: '🏷️ לפי ז\'אנר'  },
  { value: 'title-az',  label: '🔤 א–ת לפי שם'  },
  { value: 'author-az', label: '🔤 א–ת לפי מחבר' },
];

export default function FilterBar({ filters, familyMembers, onChange, onReset, viewMode, onViewChange, sortBy, onSortChange }) {
  const hasFilters = filters.search || filters.owner || filters.status;
  const members = sortedMembers(familyMembers);

  return (
    <div className="bg-white border-b border-amber-100 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex flex-col gap-2">

        {/* Row 1: Search + View Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
            <input
              type="text"
              placeholder="חיפוש..."
              value={filters.search}
              onChange={e => onChange('search', e.target.value)}
              className="w-full pr-8 pl-3 py-2 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
            />
          </div>
          <div className="flex border border-gray-200 overflow-hidden text-sm font-medium flex-shrink-0">
            <button
              onClick={() => onViewChange('shelf')}
              className={`px-3 py-2 transition-colors ${viewMode === 'shelf' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >📚</button>
            <button
              onClick={() => onViewChange('grid')}
              className={`px-3 py-2 transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >⊞</button>
          </div>
        </div>

        {/* Row 2: Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.owner}
            onChange={e => onChange('owner', e.target.value)}
            className="border border-gray-200 px-2 py-1.5 text-sm bg-gray-50 focus:outline-none flex-1 min-w-[100px]"
          >
            <option value="">כל הבעלים</option>
            {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>

          <select
            value={filters.status}
            onChange={e => onChange('status', e.target.value)}
            className="border border-gray-200 px-2 py-1.5 text-sm bg-gray-50 focus:outline-none flex-1 min-w-[100px]"
          >
            <option value="">כל הסטטוסים</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={sortBy}
            onChange={e => onSortChange(e.target.value)}
            className="border border-gray-200 px-2 py-1.5 text-sm bg-gray-50 focus:outline-none flex-1 min-w-[120px]"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {hasFilters && (
            <button onClick={onReset} className="text-sm text-indigo-600 underline whitespace-nowrap">
              נקה
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
