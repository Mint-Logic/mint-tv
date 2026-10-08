import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL } from '../services/tmdb';

export function DiscoverModal({ isOpen, onClose, onAddShow }) {
  const [discoverShows, setDiscoverShows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedShowId, setExpandedShowId] = useState(null);

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
        setDiscoverShows(data.results || []);
      } catch (err) {
        console.error('Error fetching popular shows:', err);
      }
      setLoading(false);
    }

    fetchPopular();
  }, [isOpen]);

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
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#1E293B] p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Finder & Recommendations
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold p-1"
          >
            ✕ Close
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-slate-500 animate-pulse">
            Fetching trending titles...
          </div>
        ) : (
          <div className="space-y-2.5">
            {discoverShows.map((show) => {
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
                  {/* Card Header Row */}
                  <div
                    onClick={() => setExpandedShowId(isExpanded ? null : show.id)}
                    className="flex items-center justify-between p-2.5 cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={show.name}
                          className="h-12 w-8 rounded object-cover shrink-0 bg-slate-950"
                        />
                      ) : (
                        <div className="h-12 w-8 rounded bg-slate-800 shrink-0 flex items-center justify-center text-[7px] text-slate-600">
                          N/A
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-white truncate">{show.name}</h3>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="text-amber-400 font-bold">★ {show.vote_average?.toFixed(1)}</span>
                          <span>•</span>
                          <span>{show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectShow(show);
                      }}
                      className="p-1.5 bg-[#8CFA96] text-slate-950 font-bold rounded-lg text-xs hover:opacity-90 transition-all shrink-0 active:scale-95"
                      title="Add to Watchlist"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded Tray with Image, Synopsis, IMDb & RT links */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/80 p-3 space-y-2.5 animate-in fade-in">
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}