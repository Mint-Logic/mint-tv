import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getNextEpisodeInfo, getSeasonInfo, getShowMetadata } from '../services/tmdb';

export function UpcomingQueue({ watchlist, onRemoveShow, onSelectShow }) {
  const [scheduledShows, setScheduledShows] = useState([]);
  const [inProductionShows, setInProductionShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function processQueue() {
      const today = new Date().toISOString().split('T')[0];
      const unarchivedWatchlist = watchlist.filter((show) => !show.archived);

      const scheduled = [];
      const inProduction = [];

      await Promise.all(
        unarchivedWatchlist.map(async (show) => {
          let season = show.currentSeason || 1;
          let episode = show.currentEpisode || 1;

          const [seasonData, meta] = await Promise.all([
            getSeasonInfo(show.id, season),
            getShowMetadata(show.id),
          ]);

          const totalSeasonEpisodes = seasonData?.episodes?.length || 0;
          const isSeasonCompleted = totalSeasonEpisodes > 0 && episode > totalSeasonEpisodes;

          const isOngoingOrRenewed =
            meta?.inProduction ||
            meta?.status === 'Returning Series' ||
            meta?.status === 'In Production';

          // 1. Check if there's a next episode with a specific future air date
          let epData = null;
          let airDate = null;

          if (!isSeasonCompleted) {
            epData = await getNextEpisodeInfo(show.id, season, episode);
            airDate = epData?.air_date || null;
          } else if (meta && season < meta.numberOfSeasons) {
            const nextSeasonData = await getSeasonInfo(show.id, season + 1);
            epData = nextSeasonData?.episodes?.[0] || null;
            airDate = epData?.air_date || null;
            season = season + 1;
            episode = 1;
          }

          const hasFutureAirDate = Boolean(airDate && airDate > today);

          const hydratedShow = {
            ...show,
            currentSeason: season,
            currentEpisode: episode,
            network: meta?.network || 'Unknown Streamer',
            airDate,
            status: meta?.status || 'In Production',
            numberOfSeasons: meta?.numberOfSeasons || 0,
            episodeName: epData?.name || `Episode ${episode}`,
          };

          if (hasFutureAirDate) {
            scheduled.push(hydratedShow);
          } else if (isOngoingOrRenewed && isSeasonCompleted) {
            // Show is renewed/in production, but TMDB hasn't set an exact air date yet
            inProduction.push(hydratedShow);
          }
        })
      );

      // Sort scheduled shows chronologically by air date
      scheduled.sort((a, b) => (a.airDate || '').localeCompare(b.airDate || ''));
      // Sort in-production shows alphabetically
      inProduction.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setScheduledShows(scheduled);
      setInProductionShows(inProduction);
      setLoading(false);
    }

    if (watchlist.length > 0) {
      processQueue();
    } else {
      setScheduledShows([]);
      setInProductionShows([]);
      setLoading(false);
    }
  }, [watchlist]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-bold text-slate-500">
        Checking upcoming air dates & production status...
      </div>
    );
  }

  const totalUpcoming = scheduledShows.length + inProductionShows.length;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="sticky top-[49px] z-30 bg-[#0F172A] pt-1 pb-2">
        <div className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#1E293B] px-4 py-2.5 text-xs font-bold shadow-md text-slate-300">
          <span>Upcoming & Production</span>
          <span className="text-[#8CFA96]">{totalUpcoming} Tracked</span>
        </div>
      </div>

      {totalUpcoming === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
          <p className="text-sm font-medium text-slate-400">No upcoming air dates or renewed series</p>
          <p className="mt-1 text-xs text-slate-500">
            Shows on hiatus or with scheduled release dates will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* SECTION 1: CONFIRMED SCHEDULED DATES */}
          {scheduledShows.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-[#8CFA96] px-1">
                📅 Confirmed Air Dates ({scheduledShows.length})
              </h3>
              {scheduledShows.map((show) => (
                <UpcomingCard key={show.id} show={show} onSelectShow={onSelectShow} onRemoveShow={onRemoveShow} isScheduled={true} />
              ))}
            </div>
          )}

          {/* SECTION 2: RENEWED & IN PRODUCTION (NO DATE YET) */}
          {inProductionShows.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 px-1">
                🛠️ Renewed & In Production ({inProductionShows.length})
              </h3>
              {inProductionShows.map((show) => (
                <UpcomingCard key={show.id} show={show} onSelectShow={onSelectShow} onRemoveShow={onRemoveShow} isScheduled={false} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UpcomingCard({ show, onSelectShow, onRemoveShow, isScheduled }) {
  const season = show.currentSeason || 1;
  const episode = show.currentEpisode || 1;
  const backdropUrl = show.backdrop
    ? `${IMAGE_BASE_URL}${show.backdrop}`
    : show.poster
    ? `${IMAGE_BASE_URL}${show.poster}`
    : '';

  return (
    <div
      onClick={() => onSelectShow(show.id)}
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-xl cursor-pointer hover:border-[#8CFA96]/50 transition-all"
    >
      <div
        className="relative h-36 bg-slate-900 bg-cover bg-top"
        style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent"></div>

        <div className="absolute top-3 left-3 flex flex-col items-start space-y-1 z-10">
          {isScheduled ? (
            <span className="rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-xs font-extrabold text-[#8CFA96] backdrop-blur-md shadow-md">
              Airs: {show.airDate}
            </span>
          ) : (
            <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold text-amber-400 backdrop-blur-md shadow-md">
              In Production / TBA
            </span>
          )}
          <span className="rounded-md border border-slate-700/80 bg-slate-900/90 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-300 backdrop-blur-md shadow-md">
            S{String(season).padStart(2, '0')} • E{String(episode).padStart(2, '0')}
          </span>
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

      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-300 truncate">{show.name}</span>
          <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[9px] font-bold text-slate-400 shrink-0">
            {show.network}
          </span>
        </div>
        <div className="mt-0.5 text-xs font-bold text-white truncate">
          {isScheduled ? `E${episode}: ${show.episodeName}` : 'Awaiting premiere date release'}
        </div>
      </div>
    </div>
  );
}

export default UpcomingQueue;