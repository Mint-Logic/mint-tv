import React, { useState, useEffect } from 'react';
import { searchShows, IMAGE_BASE_URL } from '../services/tmdb';

export function SearchModal({ isOpen, onClose, onAddShow, watchlist = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addedShowIds, setAddedShowIds] = useState(new Set());

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await searchShows(query);
        setResults(res.slice(0, 10));
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  function clearQuery() {
    setQuery('');
    setResults([]);
  }

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

    setAddedShowIds((prev) => new Set(prev).add(show.id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 p-3 pt-6 backdrop-blur-sm sm:p-4 sm:pt-12">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-slate-800 bg-[#1E293B] p-4 shadow-2xl">
        
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white">Search TMDB</h2>
          <button 
            onClick={onClose} 
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Input Box - Sticky at top of modal */}
        <div className="relative mb-3 w-full shrink-0">
          <input
            type="text"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type show title (e.g., Severance, Breaking Bad)..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-3.5 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#8CFA96] focus:outline-none"
          />
          {query && (
            <button
              onClick={clearQuery}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Scrollable Results Area */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading && <p className="py-6 text-center text-xs text-slate-500">Searching TMDB...</p>}
          {!loading && results.length === 0 && query.trim() && (
            <p className="py-6 text-center text-xs text-slate-500">No shows found.</p>
          )}
          {!loading && results.map((show) => {
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
                      className="h-14 w-10 shrink-0 rounded-lg object-cover" 
                    />
                  ) : (
                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[9px] text-slate-500">
                      No Poster
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-white">{show.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'}
                    </div>
                  </div>
                </div>

                <button
                  disabled={added}
                  onClick={() => handleAdd(show)}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    added
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-[#8CFA96] text-slate-900 hover:opacity-90'
                  }`}
                >
                  {added ? 'Added ✓' : '+ Add'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}