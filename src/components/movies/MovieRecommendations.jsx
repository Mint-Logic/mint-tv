import React, { useState, useEffect } from 'react';
import { getMovieRecommendationsByEra, getMovieDetails, THUMB_BASE_URL, IMAGE_BASE_URL } from '../../services/tmdb';

const ERAS = [
  { id: '2020s', label: '2020s' },
  { id: '2010s', label: '2010s' },
  { id: '2000s', label: '2000s' },
  { id: '1990s', label: '1990s' },
  { id: 'Classic', label: 'Classic' },
];

export function MovieRecommendations({ movieWatchlist = [], onAddMovie, onSelectMovie }) {
  const [selectedEra, setSelectedEra] = useState('2020s');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadMovies() {
      setLoading(true);
      const results = await getMovieRecommendationsByEra(selectedEra);
      if (!isCancelled) {
        setMovies(results);
        setLoading(false);
      }
    }

    loadMovies();

    return () => {
      isCancelled = true;
    };
  }, [selectedEra]);

  async function handleAdd(movieId) {
    setAddingId(movieId);
    const details = await getMovieDetails(movieId);
    if (details) {
      onAddMovie(details);
    }
    setAddingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Sticky Era Segmented Control Container */}
      <div className="sticky top-[45px] z-30 bg-[#0F172A] -mt-[3px] pt-3 pb-2 space-y-2">
        <div className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#1E293B] px-2 py-1.5 text-[11px] sm:text-xs font-bold shadow-md">
          {ERAS.map((era) => (
            <button
              key={era.id}
              type="button"
              onClick={() => setSelectedEra(era.id)}
              className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                selectedEra === era.id
                  ? 'bg-[#8CFA96]/15 text-[#8CFA96] border border-[#8CFA96]/40 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {era.label}
            </button>
          ))}
        </div>
      </div>

      {/* Discovery Feed */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          Discovering {selectedEra} movies...
        </div>
      ) : (
        <div className="space-y-3">
          {movies.map((movie) => {
            const isTracked = movieWatchlist.some((m) => m.id === movie.id);
            const isAdding = addingId === movie.id;
            const posterUrl = movie.poster_path ? `${THUMB_BASE_URL}${movie.poster_path}` : '';
            const year = movie.release_date ? movie.release_date.split('-')[0] : 'TBA';
            const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;

            return (
              <div
                key={movie.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#1E293B] border border-slate-800 hover:border-slate-700 transition-all gap-3 shadow-md"
              >
                <div
                  onClick={() => onSelectMovie && onSelectMovie(movie.id)}
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                >
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={movie.title}
                      className="w-12 h-16 object-cover rounded-lg shrink-0 bg-slate-800 border border-slate-700 shadow"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 text-[10px] text-slate-500 font-bold border border-slate-700">
                      N/A
                    </div>
                  )}

                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-black text-white truncate hover:text-[#8CFA96] transition-colors">
                      {movie.title}
                    </p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-300 font-semibold">
                      <span>{year}</span>
                      {rating && (
                        <>
                          <span>•</span>
                          <span className="text-[#8CFA96]">★ {rating}</span>
                        </>
                      )}
                    </div>
                    {movie.overview && (
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {movie.overview}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tracking Action */}
                <button
                  type="button"
                  disabled={isTracked || isAdding}
                  onClick={() => handleAdd(movie.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    isTracked
                      ? 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-[#8CFA96]/15 text-[#8CFA96] border border-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-950 active:scale-95'
                  }`}
                >
                  {isAdding ? 'Adding...' : isTracked ? 'Tracked' : '+ Add'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Attribution Footer */}
      <footer className="pt-8 pb-4 flex flex-col items-center justify-center gap-1.5 text-center">
        <p className="text-[10px] leading-tight text-slate-300 max-w-[280px]">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p className="text-[10px] text-slate-300">
          Streaming data powered by <span className="text-[#8CFA96] font-bold">JustWatch</span>.
        </p>
      </footer>
    </div>
  );
}