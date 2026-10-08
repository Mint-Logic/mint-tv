import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL } from '../services/tmdb';

const GENRES = [
  { id: 18, name: 'Drama' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 9648, name: 'Mystery' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 10759, name: 'Action & Adventure' },
];

export function DiscoverModal({ isOpen, onClose, onAddShow, watchlist = [] }) {
  const [selectedGenre, setSelectedGenre] = useState(10765); // Default Sci-Fi
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'returning' | 'ended'
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addedShowIds, setAddedShowIds] = useState(new Set());
  const [expandedShowId, setExpandedShowId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchDiscoverShows() {
      setLoading(true);
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;

      let statusQuery = '';
      if (statusFilter === 'returning') statusQuery = '&with_status=0';
      if (statusFilter === 'ended') statusQuery = '&with_status=3';

      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&with_genres=${selectedGenre}${statusQuery}&sort_by=popularity.desc&language=en-US&page=1`
        );
        const data = await res.json();
        setShows(data.results || []);
      } catch (err) {
        console.error('Discover error:', err);
      }
      setLoading(false);
    }

    fetchDiscoverShows();
  }, [selectedGenre, statusFilter, isOpen]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-slate-950/80 p-0 backdrop-blur-sm sm:justify-center sm:p-4">
      <div className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border-t border-slate-800 bg-[#1E293B] p-5 shadow-2xl sm:rounded-2xl sm:border">
        
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white">Show Finder</h2>
            <p className="text-xs text-slate-400">Jog your memory by status & genre</p>
          </div>
          <button 
            onClick={onClose} 
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Status Filter Toggle */}
        <div className="mb-3 flex rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 rounded-lg py-1.5 transition-all ${
              statusFilter === 'all' ? 'bg-slate-800 text-[#8CFA96]' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Shows
          </button>
          <button
            onClick={() => setStatusFilter('returning')}
            className={`flex-1 rounded-lg py-1.5 transition-all ${
              statusFilter === 'returning' ? 'bg-slate-800 text-[#8CFA96]' : 'text-slate-400 hover:text-white'
            }`}
          >
            On Air
          </button>
          <button
            onClick={() => setStatusFilter('ended')}
            className={`flex-1 rounded-lg py-1.5 transition-all ${
              statusFilter === 'ended' ? 'bg-slate-800 text-[#8CFA96]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ended
          </button>
        </div>

        {/* Genre Selector Pills */}
        <div className="mb-4 flex space-x-2 overflow-x-auto pb-1">
          {GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                selectedGenre === g.id
                  ? 'bg-[#8CFA96] text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <p className="py-8 text-center text-xs text-slate-500">Finding shows...</p>
          ) : shows.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">No shows matched these filters.</p>
          ) : (
            shows.map((show) => {
              const added = isShowAdded(show.id);
              const isExpanded = expandedShowId === show.id;

              return (
                <div 
                  key={show.id} 
                  className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 transition-all overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    {/* Tappable Card Header to Expand Overview */}
                    <div 
                      onClick={() => setExpandedShowId(isExpanded ? null : show.id)}
                      className="flex items-center space-x-3 overflow-hidden pr-2 flex-1 cursor-pointer"
                    >
                      {show.poster_path ? (
                        <img 
                          src={`${IMAGE_BASE_URL}${show.poster_path}`} 
                          alt={show.name} 
                          className="h-16 w-12 shrink-0 rounded-lg object-cover" 
                        />
                      ) : (
                        <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[10px] text-slate-500">
                          No Image
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{show.name}</div>
                        <div className="text-xs text-slate-400">
                          {show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'} • ★ {show.vote_average?.toFixed(1)}
                        </div>
                        <span className="text-[9px] font-semibold text-[#8CFA96]/80 block mt-0.5">
                          {isExpanded ? 'Hide overview ▲' : 'Show overview ▼'}
                        </span>
                      </div>
                    </div>

                    {/* Add Button */}
                    <button
                      disabled={added}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(show);
                      }}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        added
                          ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                          : 'bg-[#8CFA96] text-slate-900 hover:opacity-90'
                      }`}
                    >
                      {added ? 'Added ✓' : '+ Add'}
                    </button>
                  </div>

                  {/* Expanded Overview Drawer */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg">
                      {show.overview || 'No overview available for this show.'}
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