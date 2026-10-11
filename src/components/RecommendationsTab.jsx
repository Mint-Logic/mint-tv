import React, { useState, useEffect, useRef } from 'react';
import { IMAGE_BASE_URL, getShowMetadata } from '../services/tmdb';
import retroVisionLogo from '../assets/retro-vision-logo.png';

export function RecommendationsTab({ watchlist, atticShows, onAddShow, onMoveToAttic }) {
  const [subTab, setSubTab] = useState('feed'); // 'feed' | 'watchlater'
  const [feedShows, setFeedShows] = useState([]);
  const [bufferShows, setBufferShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedShowId, setExpandedShowId] = useState(null);
  const [page, setPage] = useState(1);

  // Global Era Filter State
  const [selectedEra, setSelectedEra] = useState('all');

  // Session cache to prevent duplicate titles during a session
  const sessionSeenIds = useRef(new Set());
  const isFetchingRef = useRef(false);

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

  useEffect(() => {
    async function hydrateList() {
      const needsHydration = watchLater.some((s) => !s.network || s.numberOfEpisodes === undefined);
      if (!needsHydration) return;
      const updated = await Promise.all(
        watchLater.map(async (show) => {
          if (show.network && show.numberOfEpisodes !== undefined && show.numberOfSeasons !== undefined) return show;
          const meta = await getShowMetadata(show.id);
          return {
            ...show,
            network: meta?.network || null,
            first_air_date: meta?.firstAirDate || meta?.first_air_date || show.first_air_date,
            numberOfEpisodes: meta?.numberOfEpisodes || 0,
            numberOfSeasons: meta?.numberOfSeasons || 0,
            status: meta?.status || null,
            inProduction: meta?.inProduction ?? true,
          };
        })
      );
      setWatchLater(updated);
    }
    if (watchLater.length > 0) hydrateList();
  }, [watchLater.length]);

  async function fetchDiscoverFeed(isLoadMore = false, eraOverride = null) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!isLoadMore) setLoading(true);

    const activeEra = eraOverride || selectedEra;
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

    const startPage = isLoadMore ? page + 2 : 1;

    try {
      const fetchPage = async (p) => {
        let url = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=${p}&vote_count.gte=15`;

        if (likedGenres.length > 0) url += `&with_genres=${likedGenres.join('|')}`;
        if (mutedGenres.length > 0) url += `&without_genres=${mutedGenres.join(',')}`;

        // Apply Era Bounds
        if (activeEra === '2020s') url += '&first_air_date.gte=2020-01-01';
        else if (activeEra === '2010s') url += '&first_air_date.gte=2010-01-01&first_air_date.lte=2019-12-31';
        else if (activeEra === '2000s') url += '&first_air_date.gte=2000-01-01&first_air_date.lte=2009-12-31';
        else if (activeEra === '1990s') url += '&first_air_date.gte=1990-01-01&first_air_date.lte=1999-12-31';
        else if (activeEra === '1980s') url += '&first_air_date.gte=1980-01-01&first_air_date.lte=1989-12-31';
        else if (activeEra === '1970s') url += '&first_air_date.gte=1970-01-01&first_air_date.lte=1979-12-31';
        else if (activeEra === 'vintage') url += '&first_air_date.lte=1969-12-31';

        let res = await fetch(url);
        let data = await res.json();
        let results = data.results || [];

        if (results.length === 0 && likedGenres.length > 0) {
          const fallbackUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=${p}&vote_count.gte=10`;
          res = await fetch(fallbackUrl);
          data = await res.json();
          results = data.results || [];
        }
        return results;
      };

      const [p1Results, p2Results] = await Promise.all([
        fetchPage(startPage),
        fetchPage(startPage + 1),
      ]);

      const combinedRaw = [...p1Results, ...p2Results];

      const filtered = combinedRaw.filter((show) => {
        if (
          activeWatchlistIds.has(show.id) ||
          watchLaterIds.has(show.id) ||
          atticIds.has(show.id) ||
          blacklistedIds.has(show.id) ||
          sessionSeenIds.current.has(show.id)
        ) {
          return false;
        }

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

      filtered.forEach((show) => sessionSeenIds.current.add(show.id));

      const itemsToHydrate = filtered.slice(0, 40); 
      const hydratedShows = await Promise.all(
        itemsToHydrate.map(async (show) => {
          const meta = await getShowMetadata(show.id);
          return {
            ...show,
            network: meta?.network || null,
            numberOfSeasons: meta?.numberOfSeasons || 0,
            numberOfEpisodes: meta?.numberOfEpisodes || 0,
            status: meta?.status || null,
            inProduction: meta?.inProduction ?? true,
          };
        })
      );

      if (isLoadMore) {
        // Append all newly fetched items to the hidden buffer
        setBufferShows((prev) => [...prev, ...hydratedShows]);
        setPage(startPage + 1);
      } else {
        // Initial load: give 20 to the feed, and the rest to the buffer
        setFeedShows(hydratedShows.slice(0, 20));
        setBufferShows(hydratedShows.slice(20));
        setPage(1);
      }
    } catch (err) {
      console.error('Error fetching discovery feed:', err);
    }
    setLoading(false);
    isFetchingRef.current = false;
  }

  useEffect(() => {
    fetchDiscoverFeed(false);
  }, []);

  useEffect(() => {
    if (subTab === 'feed' && feedShows.length < 20 && bufferShows.length > 0) {
      const needed = 20 - feedShows.length;
      const toAdd = bufferShows.slice(0, needed);
      setFeedShows((prev) => [...prev, ...toAdd]);
      setBufferShows((prev) => prev.slice(needed));
    }
  }, [feedShows.length, bufferShows.length, subTab]);

  // 2. Fetch more shows silently when the hidden buffer gets low (under 10)
  useEffect(() => {
    if (!loading && subTab === 'feed' && bufferShows.length < 10 && !isFetchingRef.current) {
      fetchDiscoverFeed(true);
    }
  }, [bufferShows.length, loading, subTab]);

  function handleEraSelect(eraId) {
    setSelectedEra(eraId);
    sessionSeenIds.current.clear();
    setFeedShows([]);
    setBufferShows([]); // <-- Clear the buffer so old eras don't bleed in
    fetchDiscoverFeed(false, eraId);
  }

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

  // Filter Watch Later Queue by Selected Era
  const filteredWatchLater = watchLater.filter((show) => {
    if (selectedEra === 'all') return true;
    const year = show.first_air_date ? parseInt(show.first_air_date.split('-')[0], 10) : 0;
    if (!year) return false;

    if (selectedEra === '2020s') return year >= 2020;
    if (selectedEra === '2010s') return year >= 2010 && year <= 2019;
    if (selectedEra === '2000s') return year >= 2000 && year <= 2009;
    if (selectedEra === '1990s') return year >= 1990 && year <= 1999;
    if (selectedEra === '1980s') return year >= 1980 && year <= 1989;
    if (selectedEra === '1970s') return year >= 1970 && year <= 1979;
    if (selectedEra === 'vintage') return year < 1970;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Header Structure */}
      <div className="sticky top-[49px] z-30 bg-[#0F172A] pt-1 pb-2 space-y-2">
        <div className="flex w-full items-center justify-evenly rounded-xl border border-slate-800 bg-[#1E293B] py-2.5 text-[11px] sm:text-xs font-bold shadow-md">
          <button
            onClick={() => setSubTab('feed')}
            className={`flex items-center justify-center space-x-1 px-4 transition-colors ${
              subTab === 'feed' ? 'text-[#8CFA96]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="h-3 w-3 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
            </svg>
            <span>Feed</span>
          </button>

          <button
            onClick={() => setSubTab('watchlater')}
            className={`flex items-center justify-center space-x-1 px-4 transition-colors ${
              subTab === 'watchlater' ? 'text-[#8CFA96]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Watch Later ({watchLater.length})</span>
          </button>
        </div>

        {/* PERMANENT ERA FILTER PILLS ACCESSIBLE BY BOTH SUB-TABS */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {ERAS.map((era) => (
            <button
              key={era.id}
              onClick={() => handleEraSelect(era.id)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 transition-all ${
                selectedEra === era.id
                  ? 'bg-[#8CFA96] text-slate-900 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {era.label}
            </button>
          ))}
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
              <p className="text-xs text-slate-400">End of recommendations for this era.</p>
              <button onClick={() => handleEraSelect('all')} className="text-xs font-bold text-[#8CFA96] underline">
                Show All Eras
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

                const isOnAir = show.inProduction || show.status === 'Returning Series';

                return (
                  <div key={show.id} className="rounded-xl border border-slate-800 bg-[#1E293B] overflow-hidden transition-all">
                    <div
                      onClick={() => setExpandedShowId(isExpanded ? null : show.id)}
                      className="flex items-start space-x-3 p-2.5 cursor-pointer select-none"
                    >
                      {posterUrl ? (
                        <img src={posterUrl} alt={show.name} className="h-20 w-15 rounded-lg object-cover shrink-0 bg-slate-900 shadow-sm" />
                      ) : (
                        <div className="h-16 w-11 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-[7px] text-slate-600 shadow-sm">
                          N/A
                        </div>
                      )}

                      <div className="w-0 flex-1 flex flex-col justify-between self-stretch">
                        <div className="space-y-0.5">
                          {/* TITLE AND HIDE BUTTON WRAPPER */}
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="text-xs font-extrabold text-white truncate leading-snug">
                              {show.name}
                            </h3>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleBlacklist(show.id); }}
                              className="flex items-center justify-center text-rose-700 transition-transform active:scale-90 shrink-0"
                              title="Hide Show"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </svg>
                            </button>
                          </div>

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

                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-tight border ${
                              isOnAir
                                ? 'bg-emerald-500/10 text-[#8CFA96] border-[#8CFA96]/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {isOnAir ? 'On Air' : show.status || 'Ended'}
                            </span>
                            {show.numberOfSeasons > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-tight bg-slate-800 text-slate-300 border border-slate-700">
                                {show.numberOfSeasons} {show.numberOfSeasons === 1 ? 'Season' : 'Seasons'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* RIGHT-ANCHORED ACTION ICONS (HIDE REMOVED) */}
                        <div className="flex items-center justify-end gap-3 mt-0 ml-auto">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSaveWatchLater(show); }}
                            className="flex items-center justify-center text-[#8CFA96] hover:scale-110 transition-transform active:scale-95"
                            title="Save for Watch Later"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSaveAttic(show); }}
                            className="flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                            title="Move to RetroVision"
                          >
                            <img 
                              src={retroVisionLogo} 
                              alt="RetroVision" 
                              className="h-6 w-6 rounded object-cover" 
                            />
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
                className="w-full py-2.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-bold text-slate-400 hover:text-white transition-all mt-2"
              >
                More Suggestions
              </button>
            </>
          )}
        </div>
      )}

      {/* WATCH LATER TAB */}
      {subTab === 'watchlater' && (
        <div className="space-y-2 mt-2">
          {filteredWatchLater.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center space-y-1">
              <p className="text-sm font-medium text-slate-400">
                {selectedEra === 'all' ? 'Your queue is empty' : `No items in Watch Later for ${selectedEra}`}
              </p>
              <p className="text-xs text-slate-500">
                {selectedEra === 'all' ? 'Save shows here to decide on them later.' : 'Try selecting "All Eras" to view your saved queue.'}
              </p>
            </div>
          ) : (
            [...filteredWatchLater].reverse().map((show) => {
              const posterUrl = show.poster_path || show.poster ? `${IMAGE_BASE_URL}${show.poster_path || show.poster}` : '';
              const isExpanded = expandedShowId === show.id;
              const imdbSearchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(show.name)}`;
              const isOnAir = show.inProduction || show.status === 'Returning Series';

              return (
                <div key={show.id} className="rounded-xl border border-slate-800 bg-[#1E293B] overflow-hidden transition-all">
                  <div onClick={() => setExpandedShowId(isExpanded ? null : show.id)} className="flex items-start space-x-3 p-2.5 cursor-pointer select-none">
                    {posterUrl ? (
                      <img src={posterUrl} alt={show.name} className="h-20 w-15 rounded-lg object-cover shrink-0 bg-slate-900 shadow-sm" />
                    ) : (
                      <div className="h-16 w-11 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-[7px] text-slate-600 shadow-sm">N/A</div>
                    )}
                    
                   <div className="w-0 flex-1 flex flex-col justify-between self-stretch">
                      <div className="space-y-0.5">
                        {/* TITLE AND DROP BUTTON WRAPPER */}
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-extrabold text-white truncate leading-snug">{show.name}</h4>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setWatchLater(prev => prev.filter(s => s.id !== show.id)); }}
                            className="flex items-center justify-center text-rose-700 transition-transform active:scale-90 shrink-0"
                            title="Drop Show"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400 flex-wrap">
                          <span className="text-amber-400 font-bold shrink-0">★ {show.vote_average?.toFixed(1) || 'N/A'}</span>
                          {show.network && (
                            <>
                              <span className="shrink-0">•</span>
                              <span className="text-slate-300 truncate">{show.network}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-tight border ${
                            isOnAir
                              ? 'bg-emerald-500/10 text-[#8CFA96] border-[#8CFA96]/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {isOnAir ? 'On Air' : show.status || 'Ended'}
                          </span>
                          {show.numberOfSeasons > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-tight bg-slate-800 text-slate-300 border border-slate-700">
                              {show.numberOfSeasons} {show.numberOfSeasons === 1 ? 'Season' : 'Seasons'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* WATCH LATER ACTIONS (DROP REMOVED) */}
                      <div className="flex items-center justify-end gap-3 mt-0 ml-auto">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handlePromoteToWatchlist(show); }}
                          className="flex items-center justify-center text-[#8CFA96] transition-transform active:scale-90"
                          title="Add to Watchlist"
                        >
                          <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleMoveWLtoAttic(show); }}
                          className="flex items-center justify-center transition-transform active:scale-90"
                          title="Move to RetroVision"
                        >
                          <img src={retroVisionLogo} alt="RetroVision" className="h-6 w-6 rounded object-cover" />
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

export default RecommendationsTab;