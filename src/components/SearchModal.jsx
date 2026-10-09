import React, { useState, useEffect } from 'react';
import { searchShows as searchTMDB, IMAGE_BASE_URL } from '../services/tmdb';

export function SearchModal({ isOpen, onClose, onAddShow, watchlist = [] }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [trendingShows, setTrendingShows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedShowId, setExpandedShowId] = useState(null);

  // Fetch trending recommendations when opened
  useEffect(() => {
    if (!isOpen) return;

    async function fetchPopular() {
      setLoading(true);
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}&language=en-US&page=1`
        );
        const data = await res.json();
        setTrendingShows(data.results || []);
      } catch (err) {
        console.error('Error fetching trending shows:', err);
      }
      setLoading(false);
    }

    fetchPopular();
  }, [isOpen]);

  // Smoothed Live search query handling
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Instantly trigger loading state the moment a key is pressed to prevent erratic UI jumping
    setLoading(true);

    const timer = setTimeout(async () => {
      const results = await searchTMDB(query);
      setSearchResults(results);
      setLoading(false);
    }, 600); // Increased delay to 600ms for a smoother typing experience

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  function handleSelectShow(show) {
    onAddShow({
      id: show.id,
      name: show.name,
      poster: show.poster_path,
      backdrop: show.backdrop_path,
      currentSeason: 1,
      currentEpisode: 1,
      completed: false,
    });
  }

  const showsToDisplay = query.trim() ? searchResults : trendingShows;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#1E293B] p-5 shadow-2xl space-y-4 h-[85vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
            {query.trim() ? 'Search Results' : 'Trending & Popular'}
          </h2>
          <button
            onClick={() => {
              setQuery('');
              onClose();
            }}
            className="text-slate-400 hover:text-white text-xs font-bold p-1"
          >
            ✕ Close
          </button>
        </div>

        {/* Input Box */}
        <div className="shrink-0 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search TV shows..."
            autoFocus
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-3.5 pr-10 text-xs text-white placeholder-slate-500 focus:border-[#8CFA96] focus:outline-none"
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Shows Feed List */}
        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs font-bold text-slate-500 animate-pulse">
              {query.trim() ? 'Searching TMDB...' : 'Fetching trending shows...'}
            </div>
          ) : showsToDisplay.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {query.trim() ? 'No shows found matching your query.' : 'No recommendations available.'}
            </div>
          ) : (
            showsToDisplay.map((show) => {
              const isAdded = watchlist.some((s) => s.id === show.id);
              const posterUrl = show.poster_path ? `${IMAGE_BASE_URL}${show.poster_path}` : '';
              const backdropUrl = show.backdrop_path ? `${IMAGE_BASE_URL}${show.backdrop_path}` : '';
              const isExpanded = expandedShowId === show.id;

              const imdbSearchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(show.name)}`;
              const rtSearchUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(show.name)}`;

              return (
                <div
                  key={show.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedShowId(isExpanded ? null : show.id)}
                    className="flex items-start justify-between p-2.5 cursor-pointer select-none gap-2.5"
                  >
                    <div className="flex items-start space-x-3 w-full min-w-0 flex-1">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={show.name}
                          className="h-12 w-8 rounded object-cover shrink-0 bg-slate-950 mt-0.5"
                        />
                      ) : (
                        <div className="h-12 w-8 rounded bg-slate-800 shrink-0 flex items-center justify-center text-[7px] text-slate-600 mt-0.5">
                          N/A
                        </div>
                      )}

                      <div className="w-0 flex-1">
                        <h3 
                          className="text-xs font-bold text-white leading-snug"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            wordBreak: 'break-word',
                            whiteSpace: 'normal'
                          }}
                        >
                          {show.name}
                        </h3>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                          <span className="text-amber-400 font-bold">★ {show.vote_average?.toFixed(1) || 'N/A'}</span>
                          <span>•</span>
                          <span>{show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={isAdded}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAdded) handleSelectShow(show);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all active:scale-95 flex items-center self-center ${
                        isAdded
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          : 'bg-[#8CFA96] text-slate-950 hover:bg-[#7be385]'
                      }`}
                      title={isAdded ? "Already on Watchlist" : "Add to Watchlist"}
                    >
                      {isAdded ? (
                        <span>Added ✓</span>
                      ) : (
                        <>
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expanded Drawer Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/80 p-3 space-y-2.5 animate-in fade-in">
                      <h4 className="text-xs font-black text-[#8CFA96] break-words">
                        {show.name}
                      </h4>

                      {backdropUrl && (
                        <div className="relative h-28 w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                          <img src={backdropUrl} alt={show.name} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {show.overview || 'No synopsis available for this title.'}
                      </p>

                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                        <div className="flex space-x-1.5">
                          <a
                            href={imdbSearchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30 transition-all"
                          >
                            IMDb ↗
                          </a>
                          <a
                            href={rtSearchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30 transition-all"
                          >
                            Rotten Tomatoes ↗
                          </a>
                        </div>

                        <span className="text-[10px] text-slate-400">
                          Aired: {show.first_air_date || 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}