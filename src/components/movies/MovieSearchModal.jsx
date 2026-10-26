import React, { useState, useEffect } from 'react';
import { searchMovies, getTrendingMovies, getMovieDetails, THUMB_BASE_URL } from '../../services/tmdb';

export function MovieSearchModal({ isOpen, onClose, onAddMovie, movieWatchlist = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  // Load Trending Movies immediately when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    async function fetchTrending() {
      setLoading(true);
      const list = await getTrendingMovies();
      if (!isCancelled) {
        setTrendingMovies(list);
        setLoading(false);
      }
    }

    fetchTrending();
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  // Live Debounced Search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const searchData = await searchMovies(query);
      setResults(searchData);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  async function handleSelectMovie(movieId) {
    setAddingId(movieId);
    const movieData = await getMovieDetails(movieId);
    if (movieData) {
      onAddMovie(movieData);
    }
    setAddingId(null);
  }

  const isSearching = query.trim().length > 0;
  const displayList = isSearching ? results : trendingMovies;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 p-4 pt-16 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#1E293B] p-4 shadow-2xl space-y-3.5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Add Movie
          </h2>
          <button
            onClick={onClose}
            aria-label="Close search"
            className="text-slate-400 hover:text-white text-xs font-bold p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search movie title (e.g. John Wick, Avatar)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#8CFA96]"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="px-2 text-xs font-bold text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Section Subline */}
        <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-0.5">
          <span>{isSearching ? 'Search Results' : 'Trending Movies This Week'}</span>
          {loading && <span className="text-[#8CFA96] animate-pulse">Loading...</span>}
        </div>

        {/* Results List */}
        <div className="overflow-y-auto space-y-2 flex-1 pr-1">
          {!loading && isSearching && results.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-8">
              No movies found for "{query}". Try searching with fewer words.
            </p>
          )}

          {displayList.map((movie) => {
            const isAdded = movieWatchlist.some((m) => m.id === movie.id);
            const isAdding = addingId === movie.id;
            const posterUrl = movie.poster_path ? `${THUMB_BASE_URL}${movie.poster_path}` : '';
            const year = movie.release_date ? movie.release_date.split('-')[0] : 'TBA';
            const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;

            return (
              <div
                key={movie.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={movie.title}
                      className="w-10 h-14 object-cover rounded-md shrink-0 bg-slate-800"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-slate-800 rounded-md flex items-center justify-center shrink-0 text-[10px] text-slate-500 font-bold">
                      N/A
                    </div>
                  )}

                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-white truncate">{movie.title}</p>
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                      <span>{year}</span>
                      {rating && (
                        <>
                          <span>•</span>
                          <span className="text-[#8CFA96] font-semibold">★ {rating}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAdded || isAdding}
                  onClick={() => handleSelectMovie(movie.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                    isAdded
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-[#8CFA96]/15 text-[#8CFA96] border border-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-950 active:scale-95'
                  }`}
                >
                  {isAdding ? 'Adding...' : isAdded ? 'Tracked' : '+ Add'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}