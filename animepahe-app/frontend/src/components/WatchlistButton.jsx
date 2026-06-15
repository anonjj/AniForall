import { useState, useRef, useEffect } from 'react';
import { BookmarkIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { BookmarkIcon as BookmarkOutlineIcon } from '@heroicons/react/24/outline';

const STATUS_OPTIONS = [
  { value: 'watching', label: 'Watching' },
  { value: 'plan_to_watch', label: 'Plan to Watch' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' }
];

export default function WatchlistButton({ currentStatus, onStatusChange, onRemove }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusLabel = (val) => {
    return STATUS_OPTIONS.find(o => o.value === val)?.label || 'Plan to Watch';
  };

  const handleToggleAdd = () => {
    if (currentStatus) {
      onRemove();
    } else {
      onStatusChange('plan_to_watch');
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {currentStatus ? (
        <div className="flex items-stretch rounded-xl overflow-hidden border border-brandPurple/30 shadow-lg shadow-brandPurple/5">
          <button
            onClick={handleToggleAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-brandPurple/15 hover:bg-brandPurple/25 text-brandPurple font-semibold text-sm transition-colors"
          >
            <BookmarkIcon className="w-5 h-5" />
            In Watchlist
          </button>
          
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="px-2 bg-brandPurple/10 hover:bg-brandPurple/20 text-brandPurple border-l border-brandPurple/20 transition-colors"
            aria-label="Change Status"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleToggleAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 font-semibold text-sm rounded-xl transition-all shadow-md group"
        >
          <BookmarkOutlineIcon className="w-5 h-5 text-zinc-400 group-hover:text-white" />
          Add to Watchlist
        </button>
      )}

      {/* Glassmorphism Dropdown */}
      {dropdownOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 rounded-xl glass-panel-heavy border border-white/5 shadow-2xl p-1.5 z-50 animate-fadeIn">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onStatusChange(opt.value);
                setDropdownOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                currentStatus === opt.value
                  ? 'bg-brandPurple/20 text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="border-t border-white/5 my-1.5" />
          <button
            onClick={() => {
              onRemove();
              setDropdownOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            Remove from list
          </button>
        </div>
      )}
    </div>
  );
}
