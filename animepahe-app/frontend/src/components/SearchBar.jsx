import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function SearchBar({ query, setQuery, loading }) {
  return (
    <div className="relative w-full max-w-2xl mx-auto animate-fadeIn">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        {loading ? (
          <div className="w-5 h-5 border-2 border-brandPurple border-t-transparent rounded-full animate-spin" />
        ) : (
          <MagnifyingGlassIcon className="w-5 h-5 text-zinc-400" />
        )}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search anime by title (e.g. Naruto, Bleach...)"
        className="w-full pl-12 pr-4 py-4 rounded-2xl glass-input text-white text-base placeholder-zinc-500 outline-none"
      />
    </div>
  );
}
