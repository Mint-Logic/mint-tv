import React, { useState } from 'react';
import { searchShows, IMAGE_BASE_URL } from '../services/tmdb';

export function SearchModal({ isOpen, onClose, onAddShow }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

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
    setResults(res.slice(0, 8));
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-slate-950/80 p-0 backdrop-blur-sm sm:justify-center sm:p-4">
      <div className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border-t border-slate-800 bg-[#1E293B] p-5 shadow-2xl sm:rounded-2xl sm:border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white">Search TMDB</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">✕</button>
        </div>

        <input
          type="text"
          value={query}
          onChange={handleSearch}
          placeholder="Type show title (e.g., Severance, Breaking Bad)..."
          className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#8CFA96] focus:outline-none"
        />

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && <p className="py-6 text-center text-xs text-slate-500">Searching TMDB...</p>}
          {!loading && results.length === 0 && query && (
            <p className="py-6 text-center text-xs text-slate-500">No shows found.</p>
          )}
          {results.map((show) => (
            <div key={show.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-2">
              <div className="flex items-center space-x-3">
                {show.poster_path ? (
                  <img src={`${IMAGE_BASE_URL}${show.poster_path}`} alt={show.name} className="h-16 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-slate-800 text-[10px] text-slate-500">No Poster</div>
                )}
                <div>
                  <div className="text-sm font-bold text-white">{show.name}</div>
                  <div className="text-xs text-slate-400">{show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'}</div>
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
                Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}