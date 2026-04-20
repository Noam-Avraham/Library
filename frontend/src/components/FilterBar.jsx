const STATUSES = ['זמין', 'מושאל', 'רשימת משאלות'];

import { sortedMembers } from '../data/members.js';

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
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="חיפוש לפי שם ספר או מחבר..."
            value={filters.search}
            onChange={e => onChange('search', e.target.value)}
            className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
          />
        </div>

        {/* Owner filter */}
        <select
          value={filters.owner}
          onChange={e => onChange('owner', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[130px]"
        >
          <option value="">כל הבעלים</option>
          {members.map(m => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={e => onChange('status', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[120px]"
        >
          <option value="">כל הסטטוסים</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Shelf grouping / sort */}
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[155px]"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Reset */}
        {hasFilters && (
          <button onClick={onReset} className="text-sm text-indigo-600 hover:text-indigo-800 underline whitespace-nowrap">
            נקה סינון
          </button>
        )}

        <div className="flex-1" />

        {/* View Toggle */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm font-medium">
          <button
            onClick={() => onViewChange('shelf')}
            title="תצוגת מדף"
            className={`px-4 py-2 transition-colors ${viewMode === 'shelf' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            📚 מדף
          </button>
          <button
            onClick={() => onViewChange('grid')}
            title="תצוגת כרטיסים"
            className={`px-4 py-2 transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            ⊞ רשת
          </button>
        </div>

      </div>
    </div>
  );
}
