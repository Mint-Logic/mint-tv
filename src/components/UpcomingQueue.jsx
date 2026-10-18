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
            inProduction.push(hydratedShow);
          }
        })
      );

      scheduled.sort((a, b) => (a.airDate || '').localeCompare(b.airDate || ''));
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
      <div className="py-20 text-center text-xs font-bold text-slate-300">
        Checking upcoming air dates & production status...
      </div>
    );
  }

  const totalUpcoming = scheduledShows.length + inProductionShows.length;

  return (
    <div className="space-y-2">
      {/* Header Bar */}
      <div className="sticky top-[45px] z-30 bg-[#0F172A] -mt-[3px] pt-3 pb-2 space-y-2">
        <div className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#1E293B] px-4 py-2.5 text-xs font-bold shadow-md text-slate-300">
          <div className="flex items-center space-x-1">
            <svg className="h-3.5 w-3.5 shrink-0 text-[#8CFA96]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8H4z" />
              <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4H4z" />
              <path d="M8 5l3 6" />
              <path d="M13 5l3 6" />
            </svg>
            <span>Upcoming & Production</span>
          </div>
          <span className="text-[#8CFA96]">{totalUpcoming} Tracked</span>
        </div>
      </div>

      {totalUpcoming === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
          <p className="text-sm font-medium text-slate-300">No upcoming air dates or renewed series</p>
          <p className="mt-1 text-xs text-slate-300">
            Shows on hiatus or with scheduled release dates will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* SECTION 1: CONFIRMED SCHEDULED DATES */}
          {scheduledShows.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-[#8CFA96] px-1">
                Confirmed Air Dates ({scheduledShows.length})
              </h3>
              {scheduledShows.map((show) => (
                <ScheduledCard
                  key={show.id}
                  show={show}
                  onSelectShow={onSelectShow}
                  onRemoveShow={onRemoveShow}
                />
              ))}
            </div>
          )}

          {/* SECTION 2: RENEWED & IN PRODUCTION */}
          {inProductionShows.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-amber-400 px-1">
                Renewed & In Production ({inProductionShows.length})
              </h3>
              {inProductionShows.map((show) => (
                <InProductionCompactCard
                  key={show.id}
                  show={show}
                  onSelectShow={onSelectShow}
                  onRemoveShow={onRemoveShow}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScheduledCard({ show, onSelectShow, onRemoveShow }) {
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
          <span className="rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-xs font-extrabold text-[#8CFA96] backdrop-blur-md shadow-md">
            Airs: {show.airDate}
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-900/90 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-300 backdrop-blur-md shadow-md">
            S{String(season).padStart(2, '0')} • E{String(episode).padStart(2, '0')}
          </span>
        </div>

        <button
          type="button"
          title="Remove show from watchlist"
          aria-label={`Remove ${show.name} from upcoming queue`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemoveShow(show.id);
          }}
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/60 backdrop-blur-md text-rose-700 transition-transform active:scale-90 z-10"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-300 truncate">{show.name}</span>
          <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[9px] font-bold text-slate-300 shrink-0">
            {show.network}
          </span>
        </div>
        <div className="mt-0.5 text-xs font-bold text-white truncate">
          E{episode}: {show.episodeName}
        </div>
      </div>
    </div>
  );
}

function InProductionCompactCard({ show, onSelectShow, onRemoveShow }) {
  const posterUrl = show.poster ? `${IMAGE_BASE_URL}${show.poster}` : '';

  return (
    <div
      onClick={() => onSelectShow(show.id)}
      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-2 opacity-90 hover:opacity-100 hover:border-amber-500/40 transition-all cursor-pointer gap-2.5"
    >
      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={show.name}
            className="h-10 w-7 rounded object-cover shrink-0 shadow-sm"
          />
        ) : (
          <div className="h-10 w-7 rounded bg-slate-800 shrink-0 flex items-center justify-center text-[7px] text-slate-300">
            N/A
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-white truncate leading-snug">{show.name}</h4>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20 shrink-0">
              In Production
            </span>
            <span className="text-[9px] text-slate-300 truncate">
              {show.network}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        title="Remove show"
        aria-label={`Remove ${show.name}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemoveShow(show.id);
        }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/60 text-rose-700 transition-transform active:scale-90 shrink-0"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default UpcomingQueue;