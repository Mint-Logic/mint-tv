import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL } from '../services/tmdb';

export function RecommendationsTab({ watchlist, onAddShow }) {
  const [subTab, setSubTab] = useState('feed');
  const [feedShows, setFeedShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedShowId, setExpandedShowId] = useState(null);
  const [page, setPage] = useState(1);

  const [watchLater, setWatchLater] = useState(() => {
    const saved = localStorage.getItem('mint_tv_watch_later');
    return saved ? JSON.parse(saved) : [];
  });

  const [dislikedIds, setDislikedIds] = useState(() => {
    const saved = localStorage.getItem('mint_tv_disliked_ids');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('mint_tv_watch_later', JSON.stringify(watchLater));
    localStorage.setItem('mint_tv_disliked_ids', JSON.stringify(dislikedIds));
  }, [watchLater, dislikedIds]);

  async function fetchDiscoverFeed(isLoadMore = false) {
    if (!isLoadMore) setLoading(true);

    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    const likedGenres = JSON.parse(localStorage.getItem('mint_tv_liked_genres') || '[]');
    const mutedGenres = JSON.parse(localStorage.getItem('mint_tv_muted_genres') || '[]');
    const excludeAnime = localStorage.getItem('mint_tv_exclude_anime') === 'true';
    const excludeTrueCrime = localStorage.getItem('mint_tv_exclude_true_crime') === 'true';
    const boostNature = localStorage.getItem('mint_tv_boost_nature') === 'true';

    const activeWatchlistIds = new Set(watchlist.map((s) => s.id));
    const watchLaterIds = new Set(watchLater.map((s) => s.id));
    const blacklistedIds = new Set(dislikedIds);

    const targetPage = isLoadMore ? page + 1 : 1;

    try {
      let url = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=${targetPage}&vote_count.gte=30`;

      // FIX: Use pipe "|" for OR logic across liked genres instead of comma "," (AND logic)
      if (likedGenres.length > 0) {
        url += `&with_genres=${likedGenres.join('|')}`;
      }
      if (mutedGenres.length > 0) {
        url += `&without_genres=${mutedGenres.join(',')}`;
      }

      let res = await fetch(url);
      let data = await res.json();
      let rawResults = data.results || [];

      // Fallback query if genre query returns zero results
      if (rawResults.length === 0 && likedGenres.length > 0) {
        const fallbackUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=${targetPage}&vote_count.gte=30`;
        res = await fetch(fallbackUrl);
        data = await res.json();
        rawResults = data.results || [];
      }

      const filtered = rawResults.filter((show) => {
        if (activeWatchlistIds.has(show.id) || watchLaterIds.has(show.id) || blacklistedIds.has(show.id)) return false;
        const genreIds = show.genre_ids || [];
        if (excludeAnime && genreIds.includes(16) && show.origin_country?.includes('JP')) return false;
        if (excludeTrueCrime && genreIds.includes(80) && genreIds.includes(99)) return false;
        return true;
      });

      if (boostNature) {
        filtered.sort((a, b) => {
          const aNature = (a.genre_ids || []).includes(99) && /nature|wildlife|planet|animal/i.test(a.overview);
          const bNature = (b.genre_ids || []).includes(99) && /nature|wildlife|planet|animal/i.test(b.overview);
          if (aNature && !bNature) return -1;
          if (!aNature && bNature) return 1;
          return b.popularity - a.popularity;
        });
      }

      if (isLoadMore) {
        setFeedShows((prev) => [...prev, ...filtered]);
        setPage(targetPage);
      } else {
        setFeedShows(filtered.slice(0, 10));
        setPage(1);
      }
    } catch (err) {
      console.error('Error fetching discovery feed:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDiscoverFeed(false);
  }, [watchlist]);

  function handleSaveWatchLater(show) {
    setWatchLater((prev) => [...prev, show]);
    setFeedShows((prev) => prev.filter((s) => s.id !== show.id));
  }

  function handleBlacklist(showId) {
    setDislikedIds((prev) => [...prev, showId]);
    setFeedShows((prev) => prev.filter((s) => s.id !== showId));
  }

  function handlePromoteToWatchlist(show) {
    onAddShow({
      id: show.id,
      name: show.name,
      poster: show.poster_path,
      backdrop: show.backdrop_path,
      currentSeason: 1,
      currentEpisode: 1,
      completed: false,
    });
    setWatchLater((prev) => prev.filter((s) => s.id !== show.id));
  }

  function handleRemoveFromWatchLater(showId) {
    setWatchLater((prev) => prev.filter((s) => s.id !== showId));
  }

  return (
    <div className="space-y-3">
      {/* TIGHT SEGMENTED TAB HEADER */}
      <div className="flex rounded-lg border border-slate-800 bg-[#1E293B] p-0.5 text-xs font-bold">
        <button
          onClick={() => setSubTab('feed')}
          className={`flex-1 rounded py-1 transition-all ${
            subTab === 'feed' ? 'bg-slate-800 text-[#8CFA96]' : 'text-slate-400 hover:text-white'
          }`}
        >
          Feed ({feedShows.length})
        </button>
        <button
          onClick={() => setSubTab('watchlater')}
          className={`flex-1 rounded py-1 transition-all ${
            subTab === 'watchlater' ? 'bg-slate-800 text-[#8CFA96]' : 'text-slate-400 hover:text-white'
          }`}
        >
          Watch Later ({watchLater.length})
        </button>
      </div>

      {subTab === 'feed' && (
        <div className="space-y-2">
          {loading ? (
            <div className="py-12 text-center text-[11px] font-bold text-slate-500 animate-pulse">
              Curating feed...
            </div>
          ) : feedShows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 py-8 text-center space-y-2">
              <p className="text-xs text-slate-400">End of recommendations.</p>
              <button onClick={() => fetchDiscoverFeed(true)} className="text-xs font-bold text-[#8CFA96] underline">
                Refresh Feed
              </button>
            </div>
          ) : (
            <>
              {feedShows.map((show) => {
                const posterUrl = show.poster_path ? `${IMAGE_BASE_URL}${show.poster_path}` : '';
                const isExpanded = expandedShowId === show.id;

                return (
                  <div key={show.id} className="rounded-xl border border-slate-800 bg-[#1E293B] overflow-hidden">
                    <div
                      onClick={() => setExpandedShowId(isExpanded ? null : show.id)}
                      className="flex items-center justify-between p-2 cursor-pointer select-none"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                        {posterUrl ? (
                          <img src={posterUrl} alt={show.name} className="h-10 w-7 rounded object-cover shrink-0 bg-slate-900" />
                        ) : (
                          <div className="h-10 w-7 rounded bg-slate-800 shrink-0 flex items-center justify-center text-[7px] text-slate-600">
                            N/A
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-bold text-white truncate">{show.name}</h3>
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span className="text-amber-400 font-bold">★ {show.vote_average?.toFixed(1)}</span>
                            <span>•</span>
                            <span>{show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveWatchLater(show);
                          }}
                          title="Save to Watch Later"
                          className="p-1.5 text-[#8CFA96] hover:bg-[#8CFA96]/10 rounded transition-all active:scale-90"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBlacklist(show.id);
                          }}
                          title="Dismiss"
                          className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded transition-all active:scale-90"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-800 bg-slate-900/60 p-2.5 text-[11px] text-slate-300 leading-snug">
                        {show.overview || 'No synopsis provided.'}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => fetchDiscoverFeed(true)}
                className="w-full py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs font-bold text-slate-400 hover:text-white transition-all"
              >
                More Suggestions
              </button>
            </>
          )}
        </div>
      )}

      {subTab === 'watchlater' && (
        <div className="space-y-2">
          {watchLater.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 py-8 text-center text-xs text-slate-500">
              Watch Later list is empty.
            </div>
          ) : (
            watchLater.map((show) => {
              const posterUrl = show.poster_path ? `${IMAGE_BASE_URL}${show.poster_path}` : '';

              return (
                <div key={show.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#1E293B] p-2">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                    {posterUrl ? (
                      <img src={posterUrl} alt={show.name} className="h-10 w-7 rounded object-cover shrink-0 bg-slate-900" />
                    ) : (
                      <div className="h-10 w-7 rounded bg-slate-800 shrink-0 flex items-center justify-center text-[7px] text-slate-600">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{show.name}</h4>
                      <p className="text-[10px] text-amber-400 font-bold">★ {show.vote_average?.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handlePromoteToWatchlist(show)}
                      className="p-1.5 bg-[#8CFA96] text-slate-950 font-bold rounded text-xs hover:opacity-90 transition-all active:scale-95"
                      title="Add to Watchlist"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveFromWatchLater(show.id)}
                      title="Remove"
                      className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded transition-all active:scale-95"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}