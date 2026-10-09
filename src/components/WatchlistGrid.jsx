import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getNextEpisodeInfo, getSeasonInfo, getShowMetadata } from '../services/tmdb';

export function WatchlistGrid({ watchlist, onAdvanceEpisode, onSelectShow, onRemoveShow }) {
  const [subTab, setSubTab] = useState('ready'); // 'ready' | 'caughtup'
  const [airedQueue, setAiredQueue] = useState([]);
  const [completedQueue, setCompletedQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function processQueue() {
      
      const today = new Date().toISOString().split('T')[0];

      const unarchivedWatchlist = watchlist.filter((show) => !show.archived);

      const hydrated = await Promise.all(
        unarchivedWatchlist.map(async (show) => {
          let season = show.currentSeason || 1;
          let episode = show.currentEpisode || 1;

          let [seasonData, meta] = await Promise.all([
            getSeasonInfo(show.id, season),
            getShowMetadata(show.id),
          ]);

          let totalSeasonEpisodes = seasonData?.episodes?.length || 0;
          let isSeasonCompleted = totalSeasonEpisodes > 0 && episode > totalSeasonEpisodes;

          // AUTO-ADVANCE TO NEXT SEASON:
          if (isSeasonCompleted && meta && season < meta.numberOfSeasons) {
            season = season + 1;
            episode = 1;

            const updatedWatchlist = watchlist.map((s) =>
              s.id === show.id ? { ...s, currentSeason: season, currentEpisode: episode } : s
            );
            localStorage.setItem('mint_tv_shows', JSON.stringify(updatedWatchlist));

            seasonData = await getSeasonInfo(show.id, season);
            totalSeasonEpisodes = seasonData?.episodes?.length || 0;
            isSeasonCompleted = false;
          }

          const isFinalSeason = meta ? season >= meta.numberOfSeasons : false;
          const remainingCount = Math.max(0, totalSeasonEpisodes - episode);

          const shouldAutoArchive = Boolean(
            meta?.isEnded && isFinalSeason && isSeasonCompleted
          );

          if (shouldAutoArchive && !show.archived) {
            show.archived = true;
            const updated = watchlist.map((s) => (s.id === show.id ? { ...s, archived: true } : s));
            localStorage.setItem('mint_tv_shows', JSON.stringify(updated));
          }

          let epData = null;
          let isAired = false;

          if (!isSeasonCompleted) {
            epData = await getNextEpisodeInfo(show.id, season, episode);
            const airDate = epData?.air_date || null;
            isAired = airDate ? airDate <= today : true;
          }

          return {
            ...show,
            currentSeason: season,
            currentEpisode: episode,
            network: meta?.network || 'Unknown Streamer',
            airDate: epData?.air_date || null,
            isAired,
            isCompleted: isSeasonCompleted,
            shouldAutoArchive,
            remainingCount,
            totalSeasonEpisodes,
            episodeName: epData?.name || `Episode ${episode}`,
          };
        })
      );

      const activeHydrated = hydrated.filter((s) => !s.shouldAutoArchive);

      setAiredQueue(activeHydrated.filter((s) => s.isAired && !s.isCompleted));
      setCompletedQueue(activeHydrated.filter((s) => s.isCompleted));
      setLoading(false);
    }

    if (watchlist.length > 0) {
      processQueue();
    } else {
      setAiredQueue([]);
      setCompletedQueue([]);
      setLoading(false);
    }
  }, [watchlist]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-bold text-slate-500">
        Checking episode progress...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* STICKY SUB-TAB HEADER */}
      <div className="sticky top-[49px] z-30 bg-[#0F172A] pt-1 pb-2">
        <div className="flex w-full items-center justify-evenly rounded-xl border border-slate-800 bg-[#1E293B] py-2.5 text-[11px] sm:text-xs font-bold shadow-md">
          <button
            type="button"
            onClick={() => setSubTab('ready')}
            className={`px-4 transition-colors ${
              subTab === 'ready'
                ? 'text-[#8CFA96]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ready to Watch ({airedQueue.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('caughtup')}
            className={`px-4 transition-colors ${
              subTab === 'caughtup'
                ? 'text-[#8CFA96]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Caught Up ({completedQueue.length})
          </button>
        </div>
      </div>

      {/* READY TO WATCH SUB-TAB */}
      {subTab === 'ready' && (
        <div className="space-y-2">
          {airedQueue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
              <p className="text-sm font-medium text-slate-400">All caught up!</p>
              <p className="mt-1 text-xs text-slate-500">
                No unwatched episodes waiting in your queue.
              </p>
            </div>
          ) : (
            airedQueue.map((show) => {
              const season = show.currentSeason || 1;
              const episode = show.currentEpisode || 1;
              const backdropUrl = show.backdrop
                ? `${IMAGE_BASE_URL}${show.backdrop}`
                : show.poster
                ? `${IMAGE_BASE_URL}${show.poster}`
                : '';

              return (
                <div
                  key={show.id}
                  onClick={() => onSelectShow(show.id)}
                  className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-xl cursor-pointer hover:border-[#8CFA96]/50 transition-all"
                >
                  <div
                    className="relative h-44 bg-slate-900 bg-cover bg-top"
                    style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent"></div>

                    <div className="absolute top-3 left-3 flex flex-col items-start space-y-1 z-10">
                      <span className="rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-xs font-extrabold text-[#8CFA96] backdrop-blur-md shadow-md">
                        S{String(season).padStart(2, '0')} • E{String(episode).padStart(2, '0')}
                      </span>
                      {show.network && (
                        <span className="rounded-md border border-slate-700/80 bg-slate-900/90 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-300 backdrop-blur-md shadow-md">
                          {show.network}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      title="Remove show from watchlist"
                      aria-label="Remove show from watchlist"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemoveShow(show.id);
                      }}
                      className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-400 hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-400 transition-all z-10"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-extrabold text-slate-300 truncate">{show.name}</span>
                        {show.remainingCount > 0 && (
                          <span className="rounded-full bg-[#8CFA96]/15 border border-[#8CFA96]/40 px-1.5 py-0.2 text-[9px] font-black text-[#8CFA96] shrink-0">
                            +{show.remainingCount}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-white truncate">
                        E{episode}: {show.episodeName}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdvanceEpisode(show.id);
                      }}
                      title="Mark episode as watched"
                      aria-label="Mark episode as watched"
                      className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#8CFA96] transition-all hover:bg-[#8CFA96]"
                    >
                      <svg
                        className="h-3.5 w-3.5 text-[#8CFA96] group-hover:text-slate-900"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CAUGHT UP SUB-TAB */}
      {subTab === 'caughtup' && (
        <div className="space-y-2">
          {completedQueue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
              <p className="text-sm font-medium text-slate-400">No completed active shows!</p>
              <p className="mt-1 text-xs text-slate-500">
                Shows in ongoing series move here automatically when caught up. Ended series auto-archive to your Vault.
              </p>
            </div>
          ) : (
            completedQueue.map((show) => {
              const posterUrl = show.poster ? `${IMAGE_BASE_URL}${show.poster}` : '';

              return (
                <div
                  key={show.id}
                  onClick={() => onSelectShow(show.id)}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 opacity-90 hover:opacity-100 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-3">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={show.name}
                        className="h-12 w-9 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-9 rounded bg-slate-800 shrink-0 flex items-center justify-center text-[8px] text-slate-600">
                        No Image
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-white truncate">{show.name}</h3>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <svg className="h-3 w-3 text-[#8CFA96]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-[10px] text-[#8CFA96] font-semibold">
                          All episodes watched
                        </p>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700 shrink-0">
                    Caught Up
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}