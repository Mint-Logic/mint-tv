import React, { useState, useEffect, useRef } from 'react';
import { getMovieDetails, THUMB_BASE_URL, IMAGE_BASE_URL } from '../../services/tmdb';
import retroVisionLogo from '../../assets/retro-vision-logo.png';

const ERAS = [
  { id: 'all', label: 'All Eras' },
  { id: '2020s', label: '2020s' },
  { id: '2010s', label: '2010s' },
  { id: '2000s', label: '2000s' },
  { id: '1990s', label: '1990s' },
  { id: '1980s', label: '1980s' },
  { id: '1970s', label: '1970s' },
  { id: 'vintage', label: '1950s–60s' },
];

export function MovieRecommendations({ movieWatchlist = [], onAddMovie }) {
  const [feedMovies, setFeedMovies] = useState([]);
  const [bufferMovies, setBufferMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedMovieId, setExpandedMovieId] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedEra, setSelectedEra] = useState('all');

  const sessionSeenIds = useRef(new Set());
  const isFetchingRef = useRef(false);

  // Track dismissed movie IDs in localStorage (matches TV blacklist logic)
  const [dislikedIds, setDislikedIds] = useState(() => {
    const saved = localStorage.getItem('mint_movie_disliked_ids');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('mint_movie_disliked_ids', JSON.stringify(dislikedIds));
  }, [dislikedIds]);

  async function fetchDiscoverFeed(isLoadMore = false, eraOverride = null) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!isLoadMore) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const activeEra = eraOverride || selectedEra;
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;

    const watchlistIds = new Set(movieWatchlist.map((m) => m.id));
    const blacklistedIds = new Set(dislikedIds);

    let currentPage = isLoadMore ? page + 2 : 1;
    let accumulatedFiltered = [];
    let maxAttempts = 5;

    try {
      const fetchPage = async (p) => {
        let url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=${p}&vote_count.gte=100&include_adult=false`;

        if (activeEra === '2020s') url += '&primary_release_date.gte=2020-01-01';
        else if (activeEra === '2010s') url += '&primary_release_date.gte=2010-01-01&primary_release_date.lte=2019-12-31';
        else if (activeEra === '2000s') url += '&primary_release_date.gte=2000-01-01&primary_release_date.lte=2009-12-31';
        else if (activeEra === '1990s') url += '&primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31';
        else if (activeEra === '1980s') url += '&primary_release_date.gte=1980-01-01&primary_release_date.lte=1989-12-31';
        else if (activeEra === '1970s') url += '&primary_release_date.gte=1970-01-01&primary_release_date.lte=1979-12-31';
        else if (activeEra === 'vintage') url += '&primary_release_date.lte=1969-12-31';

        const res = await fetch(url);
        const data = await res.json();
        return data.results || [];
      };

      while (accumulatedFiltered.length < 20 && maxAttempts > 0) {
        const [p1Results, p2Results] = await Promise.all([
          fetchPage(currentPage),
          fetchPage(currentPage + 1),
        ]);

        const combinedRaw = [...p1Results, ...p2Results];
        if (combinedRaw.length === 0) break;

        const pageFiltered = combinedRaw.filter((movie) => {
          if (
            watchlistIds.has(movie.id) ||
            blacklistedIds.has(movie.id) ||
            sessionSeenIds.current.has(movie.id)
          ) {
            return false;
          }
          return true;
        });

        pageFiltered.forEach((m) => sessionSeenIds.current.add(m.id));
        accumulatedFiltered.push(...pageFiltered);

        currentPage += 2;
        maxAttempts--;
      }

      const itemsToHydrate = accumulatedFiltered.slice(0, 40);
      const hydratedMovies = await Promise.all(
        itemsToHydrate.map(async (movie) => {
          const details = await getMovieDetails(movie.id);
          return details || movie;
        })
      );

      if (isLoadMore) {
        setFeedMovies((prev) => [...prev, ...hydratedMovies.slice(0, 20)]);
        setBufferMovies((prev) => [...prev, ...hydratedMovies.slice(20)]);
        setPage(currentPage);
      } else {
        setFeedMovies(hydratedMovies.slice(0, 20));
        setBufferMovies(hydratedMovies.slice(20));
        setPage(currentPage);
      }
    } catch (err) {
      console.error('Error fetching movie recommendations feed:', err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }

  useEffect(() => {
    fetchDiscoverFeed(false);
  }, []);

  // Replenish visible feed when buffer has items
  useEffect(() => {
    if (feedMovies.length < 20 && bufferMovies.length > 0) {
      const needed = 20 - feedMovies.length;
      const toAdd = bufferMovies.slice(0, needed);
      setFeedMovies((prev) => [...prev, ...toAdd]);
      setBufferMovies((prev) => prev.slice(needed));
    }
  }, [feedMovies.length, bufferMovies.length]);

  // Background buffer fetch
  useEffect(() => {
    if (!loading && bufferMovies.length < 10 && !isFetchingRef.current) {
      fetchDiscoverFeed(true);
    }
  }, [bufferMovies.length, loading]);

  function handleEraSelect(eraId) {
    setSelectedEra(eraId);
    sessionSeenIds.current.clear();
    setFeedMovies([]);
    setBufferMovies([]);
    fetchDiscoverFeed(false, eraId);
  }

  function handleAddWatchlist(movie) {
    onAddMovie({ ...movie, isWatched: false });
    setFeedMovies((prev) => prev.filter((m) => m.id !== movie.id));
  }

  function handleDirectToRetroVision(movie) {
    onAddMovie({ ...movie, isWatched: true, watchedAt: new Date().toISOString() });
    setFeedMovies((prev) => prev.filter((m) => m.id !== movie.id));
  }

  function handleBlacklist(movieId) {
    setDislikedIds((prev) => [...prev, movieId]);
    setFeedMovies((prev) => prev.filter((m) => m.id !== movieId));
  }

  function handleMoreSuggestionsClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (bufferMovies.length > 0) {
      const toAdd = bufferMovies.slice(0, 20);
      setFeedMovies((prev) => [...prev, ...toAdd]);
      setBufferMovies((prev) => prev.slice(toAdd.length));
    } else {
      fetchDiscoverFeed(true);
    }
  }

  return (
    <div className="space-y-3">
      {/* Sticky Era Filter Bar */}
      <div className="sticky top-[45px] z-30 bg-[#0F172A] -mt-[3px] pt-3 pb-1">
        <div 
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1"
        >
          {ERAS.map((era) => (
            <button
              key={era.id}
              type="button"
              onClick={() => handleEraSelect(era.id)}
              aria-label={`Filter recommendations by ${era.label}`}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                selectedEra === era.id
                  ? 'bg-[#1E293B] border border-[#8CFA96]/40 text-[#8CFA96] shadow-sm'
                  : 'bg-[#1E293B] border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {era.label}
            </button>
          ))}
        </div>
      </div>

      {/* Discovery Feed */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-12 text-center text-[11px] font-bold text-slate-300 animate-pulse">
            Curating movie recommendations...
          </div>
        ) : feedMovies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 py-8 text-center space-y-2">
            <p className="text-xs text-slate-300">No movies found for this era.</p>
            <button onClick={() => handleEraSelect('all')} className="text-xs font-bold text-[#8CFA96] underline">
              Show All Eras
            </button>
          </div>
        ) : (
          <>
            {feedMovies.map((movie) => {
              const posterUrl = movie.poster ? `${IMAGE_BASE_URL}${movie.poster}` : movie.poster_path ? `${THUMB_BASE_URL}${movie.poster_path}` : '';
              const backdropUrl = movie.backdrop ? `${IMAGE_BASE_URL}${movie.backdrop}` : movie.backdrop_path ? `${IMAGE_BASE_URL}${movie.backdrop_path}` : '';
              const isExpanded = expandedMovieId === movie.id;
              const year = movie.releaseYear || (movie.release_date ? movie.release_date.split('-')[0] : 'TBA');
              const rating = movie.tmdbRating || (movie.vote_average ? movie.vote_average.toFixed(1) : null);
              const imdbSearchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(movie.title)}`;
              const rtSearchUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.title)}`;

              return (
                <div key={movie.id} className="rounded-xl border border-slate-800 bg-[#1E293B] overflow-hidden transition-all">
                  <div
                    onClick={() => setExpandedMovieId(isExpanded ? null : movie.id)}
                    className="flex items-start space-x-3 p-2 cursor-pointer select-none"
                  >
                    {posterUrl ? (
                      <img src={posterUrl} alt={movie.title} className="h-22 w-14 rounded-lg object-cover shrink-0 bg-slate-900 shadow-sm" />
                    ) : (
                      <div className="h-22 w-14 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-[7px] text-slate-300 shadow-sm">
                        N/A
                      </div>
                    )}

                    <div className="w-0 flex-1 flex flex-col justify-between self-stretch">
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-start gap-2">
                          <h3
                            className="text-xs font-extrabold text-white leading-snug truncate"
                          >
                            {movie.title}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleBlacklist(movie.id);
                            }}
                            aria-label={`Hide ${movie.title} from feed`}
                            className="p-1 -mr-1 flex items-center justify-center text-rose-700 transition-transform active:scale-90 shrink-0"
                            title="Hide Movie"
                          >
                            <svg className="h-4 w-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-300 flex-wrap">
                          {rating && <span className="text-amber-400 font-bold shrink-0">★ {rating}</span>}
                          <span className="shrink-0">•</span>
                          <span className="shrink-0">{year}</span>
                          {movie.runtimeFormatted && (
                            <>
                              <span className="shrink-0">•</span>
                              <span className="shrink-0">{movie.runtimeFormatted}</span>
                            </>
                          )}
                          {movie.mpaaRating && (
                            <span className="border border-slate-700 px-1 rounded text-[8px] uppercase font-bold text-slate-300">
                              {movie.mpaaRating}
                            </span>
                          )}
                        </div>

                        {movie.leadActors && movie.leadActors.length > 0 && (
                          <p className="text-[10px] text-slate-400 truncate pt-0.5">
                            {movie.leadActors.join(' • ')}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-3 mt-1 -mb-1 ml-auto">
                        {/* Direct to Main Watchlist */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddWatchlist(movie);
                          }}
                          aria-label={`Add ${movie.title} to Watchlist`}
                          className="p-1 flex items-center justify-center text-[#8CFA96] transition-transform active:scale-90"
                          title="Add to Watchlist"
                        >
                          <svg className="h-6 w-6 fill-current pointer-events-none" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>

                        {/* Direct to RetroVision */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDirectToRetroVision(movie);
                          }}
                          aria-label={`Log ${movie.title} to RetroVision`}
                          className="p-1 flex items-center justify-center transition-transform active:scale-90"
                          title="Log to RetroVision"
                        >
                          <img
                            src={retroVisionLogo}
                            alt="RetroVision"
                            className="h-5.5 w-5.5 rounded object-cover pointer-events-none"
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Overview Drawer */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-900/80 p-3 space-y-2.5 animate-in fade-in">
                      {backdropUrl && (
                        <div className="relative aspect-video w-full max-h-64 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
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
                          Released: {movie.releaseDate || movie.release_date || 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleMoreSuggestionsClick}
              disabled={isLoadingMore}
              className="w-full py-2.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 hover:text-white transition-all mt-2 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
            >
              {isLoadingMore ? (
                <>
                  <span className="animate-spin">↻</span>
                  <span>Loading Suggestions...</span>
                </>
              ) : (
                <span>More Suggestions</span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Attribution Footer */}
      <footer className="pt-8 pb-20 flex flex-col items-center justify-center gap-2.5 text-center">
        <div className="flex items-center justify-center gap-3">
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="The Movie Database"
            className="inline-flex items-center opacity-85 hover:opacity-100 transition-opacity"
          >
            <img src="/tmdb-logo.svg" alt="TMDB Logo" className="h-3.5 w-auto object-contain" />
          </a>
          <span className="text-slate-600 text-xs">•</span>
          <span className="text-[11px] font-bold text-[#8CFA96]">JustWatch</span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400 max-w-[320px]">
          This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming data powered by JustWatch.
        </p>
      </footer>
    </div>
  );
}

export default MovieRecommendations;