import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getShowMetadata } from '../services/tmdb';
import cosmicKittyIcon from '../assets/cosmic-kitty-icon.png';

export function RecommendationsTab({ watchlist, atticShows, onAddShow, onMoveToAttic }) {
  const [subTab, setSubTab] = useState('feed'); // 'feed' | 'watchlater'
  const [feedShows, setFeedShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedShowId, setExpandedShowId] = useState(null);
  const [page, setPage] = useState(1);

  // Watch Later Queue
  const [watchLater, setWatchLater] = useState(() => {
    const saved = localStorage.getItem('mint_tv_watch_later_new');
    return saved ? JSON.parse(saved) : [];
  });

  const [dislikedIds, setDislikedIds] = useState(() => {
    const saved = localStorage.getItem('mint_tv_disliked_ids');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('mint_tv_watch_later_new', JSON.stringify(watchLater));
    localStorage.setItem('mint_tv_disliked_ids', JSON.stringify(dislikedIds));
  }, [watchLater, dislikedIds]);

  // Hydrate Watch Later Metadata
  useEffect(() => {
    async function hydrateList() {
      const needsHydration = watchLater.some((s) => !s.network || s.numberOfEpisodes === undefined);
      if (!needsHydration) return;
      const updated = await Promise.all(
        watchLater.map(async (show) => {
          if (show.network && show.numberOfEpisodes !== undefined) return show;
          const meta = await getShowMetadata(show.id);
          return {
            ...show,
            network: meta?.network || null,
            first_air_date: meta?.firstAirDate || meta?.first_air_date || show.first_air_date,
            numberOfEpisodes: meta?.numberOfEpisodes || 0,
          };
        })
      );
      setWatchLater(updated);
    }
    if (watchLater.length > 0) hydrateList();
  }, [watchLater.length]);

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
    const atticIds = new Set((atticShows || []).map((s) => s.id));
    const blacklistedIds = new Set(dislikedIds);

    const targetPage = isLoadMore ? page + 1 : 1;

    try {
      let url = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=${targetPage}&vote_count.gte=30`;

      if (likedGenres.length > 0) url += `&with_genres=${likedGenres.join('|')}`;
      if (mutedGenres.length > 0) url += `&without_genres=${mutedGenres.join(',')}`;

      let res = await fetch(url);
      let data = await res.json();
      let rawResults = data.results || [];

      if (rawResults.length === 0 && likedGenres.length > 0) {
        const fallbackUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=${targetPage}&vote_count.gte=30`;
        res = await fetch(fallbackUrl);
        data = await res.json();
        rawResults = data.results || [];
      }

      const filtered = rawResults.filter((show) => {
        if (activeWatchlistIds.has(show.id) || watchLaterIds.has(show.id) || atticIds.has(show.id) || blacklistedIds.has(show.id)) return false;
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

      const itemsToHydrate = isLoadMore ? filtered : filtered.slice(0, 10);
      const hydratedShows = await Promise.all(
        itemsToHydrate.map(async (show) => {
          const meta = await getShowMetadata(show.id);
          return { ...show, network: meta?.network || null };
        })
      );

      if (isLoadMore) {
        setFeedShows((prev) => [...prev, ...hydratedShows]);
        setPage(targetPage);
      } else {
        setFeedShows(hydratedShows);
        setPage(1);
      }
    } catch (err) {
      console.error('Error fetching discovery feed:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDiscoverFeed(false);
  }, [watchlist, atticShows]);

  // Actions
  function handleSaveWatchLater(show) {
    setWatchLater((prev) => [...prev, show]);
    setFeedShows((prev) => prev.filter((s) => s.id !== show.id));
  }

  function handleSaveAttic(show) {
    if (onMoveToAttic) onMoveToAttic(show);
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
      poster: show.poster_path || show.poster,
      backdrop: show.backdrop_path || show.backdrop,
      currentSeason: 1,
      currentEpisode: 1,
      completed: false,
    });
    setWatchLater((prev) => prev.filter((s) => s.id !== show.id));
  }

  function handleMoveWLtoAttic(show) {
    if (onMoveToAttic) onMoveToAttic(show);
    setWatchLater((prev) => prev.filter((s) => s.id !== show.id));
  }

  return (
    <div className="space-y-3">
      {/* Header Structure */}
      <div className="sticky top-[49px] z-30 bg-[#0F172A] pt-1 pb-2">
        <div className="flex w-full items-center justify-evenly rounded-xl border border-slate-800 bg-[#1E293B] py-2.5 text-[11px] sm:text-xs font-bold shadow-md">
          <button
            onClick={() => setSubTab('feed')}
            className={`px-4 transition-colors ${
              subTab === 'feed' 
                ? 'text-[#8CFA96]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setSubTab('watchlater')}
            className={`px-4 transition-colors ${
              subTab === 'watchlater' 
                ? 'text-[#8CFA96]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Watch Later ({watchLater.length})
          </button>
        </div>
      </div>

      {/* FEED TAB */}
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
                const backdropUrl = show.backdrop_path ? `${IMAGE_BASE_URL}${show.backdrop_path}` : '';
                const isExpanded = expandedShowId === show.id;

                const imdbSearchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(show.name)}`;
                const rtSearchUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(show.name)}`;

                return (
                  <div key={show.id} className="rounded-xl border border-slate-800 bg-[#1E293B] overflow-hidden transition-all">
                    <div
                      onClick={() => setExpandedShowId(isExpanded ? null : show.id)}
                      className="flex items-start space-x-3 p-2.5 cursor-pointer select-none"
                    >
                      {posterUrl ? (
                        <img src={posterUrl} alt={show.name} className="h-16 w-11 rounded-lg object-cover shrink-0 bg-slate-900 shadow-sm" />
                      ) : (
                        <div className="h-16 w-11 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-[7px] text-slate-600 shadow-sm">
                          N/A
                        </div>
                      )}

                      <div className="w-0 flex-1">
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-extrabold text-white truncate leading-snug">
                            {show.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400 flex-wrap">
                            <span className="text-amber-400 font-bold shrink-0">★ {show.vote_average?.toFixed(1) || 'N/A'}</span>
                            <span className="shrink-0">•</span>
                            <span className="shrink-0">{show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'}</span>
                            {show.network && (
                              <>
                                <span className="shrink-0">•</span>
                                <span className="text-slate-300 truncate">{show.network}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveWatchLater(show); }}
                            className="flex items-center rounded border border-[#8CFA96]/30 bg-[#8CFA96]/10 px-2 py-1 text-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-900 transition-all active:scale-95"
                          >
                            <span className="text-[8px] font-black uppercase tracking-tight">Watch Later</span>
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveAttic(show); }}
                            className="p-0.5 rounded-lg hover:opacity-80 transition-all active:scale-95"
                            title="Move to RetroVision"
                          >
                            <img src={cosmicKittyIcon} alt="RetroVision" className="h-5 w-5 rounded object-cover" />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleBlacklist(show.id); }}
                            className="flex items-center rounded border border-red-900/30 bg-red-950/20 px-2 py-1 text-red-700 hover:bg-red-900/40 hover:text-red-600 transition-all active:scale-95"
                          >
                            <span className="text-[8px] font-black uppercase tracking-tight">Hide</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-800 bg-slate-900/80 p-3 space-y-2.5 animate-in fade-in">
                        {backdropUrl && (
                          <div className="relative h-32 w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                            <img src={backdropUrl} alt={show.name} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {show.overview || 'No overview available for this title.'}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a href={imdbSearchUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-2 py-.5 rounded border border-amber-400/30 transition-all whitespace-nowrap">IMDB</a>
                            <a href={rtSearchUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-.5 rounded border border-red-500/30 transition-all whitespace-nowrap">ROTTEN TOMATOES</a>
                          </div>
                          <span className="text-[9px] text-slate-400 font-medium shrink-0 ml-auto whitespace-nowrap">
                            Aired: {show.first_air_date || 'N/A'}
                          </span>
                        </div>
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

      {/* WATCH LATER TAB */}
      {subTab === 'watchlater' && (
        <div className="space-y-2 mt-4">
          {watchLater.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center space-y-1">
              <p className="text-sm font-medium text-slate-400">Your queue is empty</p>
              <p className="text-xs text-slate-500">Save shows here to decide on them later.</p>
            </div>
          ) : (
            [...watchLater].reverse().map((show) => {
              const posterUrl = show.poster_path || show.poster ? `${IMAGE_BASE_URL}${show.poster_path || show.poster}` : '';
              const isExpanded = expandedShowId === show.id;
              const imdbSearchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(show.name)}`;

              return (
                <div key={show.id} className="rounded-xl border border-slate-800 bg-[#1E293B] overflow-hidden transition-all">
                  <div onClick={() => setExpandedShowId(isExpanded ? null : show.id)} className="flex items-start space-x-3 p-2.5 cursor-pointer select-none">
                    {posterUrl ? (
                      <img src={posterUrl} alt={show.name} className="h-16 w-11 rounded-lg object-cover shrink-0 bg-slate-900 shadow-sm" />
                    ) : (
                      <div className="h-16 w-11 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-[7px] text-slate-600 shadow-sm">N/A</div>
                    )}
                    
                    <div className="w-0 flex-1">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-extrabold text-white truncate leading-snug">{show.name}</h4>
                        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400 flex-wrap">
                          <span className="text-amber-400 font-bold shrink-0">★ {show.vote_average?.toFixed(1) || 'N/A'}</span>
                          {show.network && (
                            <>
                              <span className="shrink-0">•</span>
                              <span className="text-slate-300 truncate">{show.network}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <button onClick={(e) => { e.stopPropagation(); handlePromoteToWatchlist(show); }} className="flex items-center rounded border border-[#8CFA96]/30 bg-[#8CFA96]/10 px-2 py-1 text-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-900 transition-all active:scale-95">
                          <span className="text-[8px] font-black uppercase tracking-tight">Watchlist</span>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); handleMoveWLtoAttic(show); }} className="p-0.5 rounded-lg hover:opacity-80 transition-all active:scale-95" title="Move to RetroVision">
                          <img src={cosmicKittyIcon} alt="RetroVision" className="h-6 w-6 rounded object-cover" />
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); setWatchLater(prev => prev.filter(s => s.id !== show.id)); }} className="flex items-center rounded border border-red-900/30 bg-red-950/20 px-2 py-1 text-red-700 hover:bg-red-900/40 hover:text-red-600 transition-all active:scale-95">
                          <span className="text-[8px] font-black uppercase tracking-tight">Drop</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-900/80 p-3 space-y-2.5 animate-in fade-in">
                      <p className="text-[11px] text-slate-300 leading-relaxed">{show.overview || 'No overview available.'}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a href={imdbSearchUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-2 py-1 rounded border border-amber-400/30 whitespace-nowrap">IMDB</a>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Aired: {show.first_air_date || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}