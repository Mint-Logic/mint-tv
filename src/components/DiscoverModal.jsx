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

export function DiscoverModal({ isOpen, onClose, onAddShow }) {
  const [selectedGenre, setSelectedGenre] = useState(10765); // Default Sci-Fi
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'returning' | 'ended'
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchDiscoverShows() {
      setLoading(true);
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;

      // Construct status parameter if active
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

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-slate-950/80 p-0 backdrop-blur-sm sm:justify-center sm:p-4">
      <div className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border-t border-slate-800 bg-[#1E293B] p-5 shadow-2xl sm:rounded-2xl sm:border">
        
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white">Show Finder</h2>
            <p className="text-xs text-slate-400">Jog your memory by status & genre</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">✕</button>
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
            🔴 On Air
          </button>
          <button
            onClick={() => setStatusFilter('ended')}
            className={`flex-1 rounded-lg py-1.5 transition-all ${
              statusFilter === 'ended' ? 'bg-slate-800 text-[#8CFA96]' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏁 Ended
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
            shows.map((show) => (
              <div key={show.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-2">
                <div className="flex items-center space-x-3">
                  {show.poster_path ? (
                    <img src={`${IMAGE_BASE_URL}${show.poster_path}`} alt={show.name} className="h-16 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-slate-800 text-[10px] text-slate-500">No Image</div>
                  )}
                  <div className="max-w-[180px]">
                    <div className="truncate text-sm font-bold text-white">{show.name}</div>
                    <div className="text-xs text-slate-400">
                      {show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'} • Rating: ★ {show.vote_average?.toFixed(1)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
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
                  }}
                  className="rounded-lg bg-[#8CFA96] px-3 py-1.5 text-xs font-bold text-slate-900 hover:opacity-90"
                >
                  + Add
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}