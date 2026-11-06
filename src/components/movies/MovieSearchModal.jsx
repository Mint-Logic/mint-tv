import React, { useState, useEffect } from 'react';
import { getTrendingMovies, getMovieDetails, THUMB_BASE_URL } from '../../services/tmdb';

function getLevenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

export function MovieSearchModal({ isOpen, onClose, onAddMovie, movieWatchlist = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [didYouMean, setDidYouMean] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [expandedMovieId, setExpandedMovieId] = useState(null);

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

  useEffect(() => {
    const clean = query.trim();
    if (!clean) {
      setResults([]);
      setDidYouMean(null);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const fetchRaw = async (q) => {
        try {
          const res = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
              q
            )}&include_adult=false`
          );
          const data = await res.json();
          return data.results || [];
        } catch {
          return [];
        }
      };

      // 1. Direct query
      let rawResults = await fetchRaw(clean);
      let correctedTitle = null;

      // 2. Fuzzy fallback: If 0 results, query prefixes/stems and find closest match
      if (rawResults.length === 0 && clean.length >= 3) {
        const stems = [
          clean.slice(0, -1),
          clean.slice(0, -2),
          clean.slice(0, 3),
        ].filter((s) => s.length >= 3);

        let candidates = [];
        for (const stem of stems) {
          const stemResults = await fetchRaw(stem);
          if (stemResults.length > 0) {
            candidates = stemResults;
            break;
          }
        }

        if (candidates.length > 0) {
          const cleanNorm = normalize(clean);
          candidates.sort((a, b) => {
            const distA = getLevenshteinDistance(cleanNorm, normalize(a.title));
            const distB = getLevenshteinDistance(cleanNorm, normalize(b.title));
            return distA - distB;
          });

          const best = candidates[0];
          const dist = getLevenshteinDistance(cleanNorm, normalize(best.title));

          if (dist <= 4 || normalize(best.title).includes(cleanNorm) || cleanNorm.includes(normalize(best.title))) {
            correctedTitle = best.title;
            rawResults = candidates;
          }
        }
      }

      setDidYouMean(correctedTitle);
      setResults(rawResults);
      setLoading(false);
    }, 350);

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

        {/* Input Box */}
        <div className="shrink-0 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movie title (e.g., John Wick, Avatar)..."
            autoFocus
            aria-label="Search movies"
            className="w-full rounded-xl flex-1 bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#8CFA96] focus:outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDidYouMean(null);
              }}
              aria-label="Clear search text"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-slate-300 hover:text-white transition-all"
              title="Clear search"
            >
              Clear
            </button>
          )}
        </div>

        {/* Smart Typo Notice Badge */}
        {didYouMean && (
          <div className="shrink-0 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
            <span className="text-slate-300">
              Showing results for: <strong className="text-amber-400">{didYouMean}</strong>
            </span>
            <button
              onClick={() => setQuery(didYouMean)}
              className="text-[10px] font-extrabold text-amber-400 underline hover:text-amber-300"
            >
              Use title
            </button>
          </div>
        )}

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
            const isAdded = movieWatchlist.some((m) => Number(m.id) === Number(movie.id));
            const isAdding = addingId === movie.id;
            const isExpanded = expandedMovieId === movie.id;
            
            const posterUrl = movie.poster_path ? `${THUMB_BASE_URL}${movie.poster_path}` : movie.poster ? `https://image.tmdb.org/t/p/w185${movie.poster}` : '';
            const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}` : movie.backdrop ? `https://image.tmdb.org/t/p/w500${movie.backdrop}` : '';
            const year = movie.release_date ? movie.release_date.split('-')[0] : movie.releaseYear || 'TBA';
            const rating = movie.vote_average ? movie.vote_average.toFixed(1) : movie.tmdbRating || null;
            
            const imdbSearchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(movie.title)}`;
            const rtSearchUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.title)}`;

            return (
              <div
                key={movie.id}
                className="rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
              >
                <div 
                  onClick={() => setExpandedMovieId(isExpanded ? null : movie.id)}
                  className="flex items-center justify-between p-2 gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectMovie(movie.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all z-10 ${
                      isAdded
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-[#8CFA96]/15 text-[#8CFA96] border border-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-950 active:scale-95'
                    }`}
                  >
                    {isAdding ? 'Adding...' : isAdded ? 'Tracked' : '+ Add'}
                  </button>
                </div>

                {/* Expandable Overview Drawer */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/80 p-3 space-y-2.5 animate-in fade-in">
                    {backdropUrl && (
                      <div className="relative aspect-video w-full max-h-48 rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                        <img src={backdropUrl} alt={movie.title} className="h-full w-full object-cover object-top" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                      </div>
                    )}

                    <h4 className="text-xs font-black text-white leading-snug">
                      {movie.title}
                    </h4>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {movie.overview || 'No overview available for this title.'}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={imdbSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30 transition-all whitespace-nowrap"
                        >
                          IMDB
                        </a>
                        <a
                          href={rtSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30 transition-all whitespace-nowrap"
                        >
                          ROTTEN TOMATOES
                        </a>
                      </div>
                      <span className="text-[9px] text-slate-300 font-medium shrink-0 ml-auto whitespace-nowrap">
                        Released: {movie.release_date || movie.releaseDate || 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}