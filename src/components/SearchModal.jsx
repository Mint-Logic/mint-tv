import React, { useState } from 'react';
import { searchShows, IMAGE_BASE_URL } from '../services/tmdb';

export function SearchModal({ isOpen, onClose, onAddShow, watchlist = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addedShowIds, setAddedShowIds] = useState(new Set());

  if (!isOpen) return null;

  async function handleSearch(e) {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const res = await searchShows(val);
    setResults(res.slice(0, 10));
    setLoading(false);
  }

  function clearQuery() {
    setQuery('');
    setResults([]);
  }

  // Check if a show is already in the user's watchlist or added during this session
  function isShowAdded(showId) {
    const isInWatchlist = watchlist.some((s) => s.id === showId);
    return isInWatchlist || addedShowIds.has(showId);
  }

  function handleAdd(show) {
    onAddShow({
      id: show.id,
      name: show.name,
      poster: show.poster_path,
      backdrop: show.backdrop_path,
      currentSeason: 1,
      currentEpisode: 1,
      completed: false,
    });

    // Mark as added locally so the button instantly changes state
    setAddedShowIds((prev) => new Set(prev).add(show.id));
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-start bg-slate-950/80 p-0 backdrop-blur-sm sm:justify-center sm:p-4">
      <div className="mx-auto flex h-full max-h-[90vh] w-full max-w-md flex-col rounded-b-3xl border-b border-slate-800 bg-[#1E293B] p-5 shadow-2xl sm:rounded-2xl sm:border">
        
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white">Search TMDB</h2>
          <button 
            onClick={onClose} 
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Input Box with Clear (X) Button */}
        <div className="relative mb-4 w-full">
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Type show title (e.g., Severance, Breaking Bad)..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-4 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:border-[#8CFA96] focus:outline-none"
          />
          {query && (
            <button
              onClick={clearQuery}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && <p className="py-6 text-center text-xs text-slate-500">Searching TMDB...</p>}
          {!loading && results.length === 0 && query && (
            <p className="py-6 text-center text-xs text-slate-500">No shows found.</p>
          )}
          {results.map((show) => {
            const added = isShowAdded(show.id);

            return (
              <div 
                key={show.id} 
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-2"
              >
                <div className="flex items-center space-x-3 overflow-hidden pr-2">
                  {show.poster_path ? (
                    <img 
                      src={`${IMAGE_BASE_URL}${show.poster_path}`} 
                      alt={show.name} 
                      className="h-16 w-12 shrink-0 rounded-lg object-cover" 
                    />
                  ) : (
                    <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[10px] text-slate-500">
                      No Poster
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">{show.name}</div>
                    <div className="text-xs text-slate-400">
                      {show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'}
                    </div>
                  </div>
                </div>

                <button
                  disabled={added}
                  onClick={() => handleAdd(show)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    added
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-[#8CFA96] text-slate-900 hover:opacity-90'
                  }`}
                >
                  {added ? 'Added ✓' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}