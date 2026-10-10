import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getNextEpisodeInfo, getSeasonInfo, getShowMetadata } from '../services/tmdb';

export function UpcomingQueue({ watchlist, onRemoveShow, onSelectShow }) {
  const [upcomingShows, setUpcomingShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function processQueue() {
      const today = new Date().toISOString().split('T')[0];
      const unarchivedWatchlist = watchlist.filter((show) => !show.archived);

      const hydrated = await Promise.all(
        unarchivedWatchlist.map(async (show) => {
          let season = show.currentSeason || 1;
          let episode = show.currentEpisode || 1;

          const [seasonData, meta] = await Promise.all([
            getSeasonInfo(show.id, season),
            getShowMetadata(show.id),
          ]);

          const totalSeasonEpisodes = seasonData?.episodes?.length || 0;
          const isSeasonCompleted = totalSeasonEpisodes > 0 && episode > totalSeasonEpisodes;

          // IF SEASON IS COMPLETED: Only include in Upcoming if a FUTURE season or future air date exists (season hiatus)
          if (isSeasonCompleted) {
            // Check if there's a future season or future premiere
            if (meta && season < meta.numberOfSeasons) {
              const nextSeasonData = await getSeasonInfo(show.id, season + 1);
              const nextEpAirDate = nextSeasonData?.episodes?.[0]?.air_date;

              if (nextEpAirDate && nextEpAirDate > today) {
                return {
                  ...show,
                  currentSeason: season + 1,
                  currentEpisode: 1,
                  network: meta?.network || 'Unknown Streamer',
                  airDate: nextEpAirDate,
                  episodeName: nextSeasonData?.episodes?.[0]?.name || 'Season Premiere',
                };
              }
            }
            return null;
          }

          // IF MID-SEASON: Check if the current upcoming episode has a future air date
          const epData = await getNextEpisodeInfo(show.id, season, episode);
          const airDate = epData?.air_date || null;
          const isFutureAired = Boolean(airDate && airDate > today);

          if (!isFutureAired) {
            return null;
          }

          return {
            ...show,
            currentSeason: season,
            currentEpisode: episode,
            network: meta?.network || 'Unknown Streamer',
            airDate,
            episodeName: epData?.name || `Episode ${episode}`,
          };
        })
      );

      const validUpcoming = hydrated.filter(Boolean);
      validUpcoming.sort((a, b) => (a.airDate || '').localeCompare(b.airDate || ''));

      setUpcomingShows(validUpcoming);
      setLoading(false);
    }

    if (watchlist.length > 0) {
      processQueue();
    } else {
      setUpcomingShows([]);
      setLoading(false);
    }
  }, [watchlist]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-bold text-slate-500">
        Checking upcoming air dates...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-[49px] z-30 bg-[#0F172A] pt-1 pb-2">
        <div className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#1E293B] px-4 py-2.5 text-xs font-bold shadow-md text-slate-300">
          <span>Upcoming Releases</span>
          <span className="text-[#8CFA96]">{upcomingShows.length} Scheduled</span>
        </div>
      </div>

      {upcomingShows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
          <p className="text-sm font-medium text-slate-400">No upcoming air dates scheduled</p>
          <p className="mt-1 text-xs text-slate-500">
            Shows on hiatus with confirmed future release dates will automatically appear here.
          </p>
        </div>
      ) : (
        upcomingShows.map((show) => {
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
                className="relative h-40 bg-slate-900 bg-cover bg-top"
                style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent"></div>

                <div className="absolute top-3 left-3 flex flex-col items-start space-y-1 z-10">
                  <span className="rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-xs font-extrabold text-[#8CFA96] backdrop-blur-md shadow-md">
                    Airs: {show.airDate}
                  </span>
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
                  E{episode}: {show.episodeName}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default UpcomingQueue;