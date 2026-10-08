import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getNextEpisodeInfo, getShowMetadata } from '../services/tmdb';

function getCountdownBadge(airDateString) {
  if (!airDateString) return { label: 'TBA', color: 'bg-slate-800 text-slate-400 border-slate-700' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = airDateString.split('-').map(Number);
  const airDate = new Date(year, month - 1, day);
  airDate.setHours(0, 0, 0, 0);

  const diffTime = airDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Aired Recently', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' };
  } else if (diffDays === 0) {
    return { label: '🔥 Airs Today', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' };
  } else if (diffDays === 1) {
    return { label: '⚡ Drops Tomorrow', color: 'bg-amber-500/20 text-amber-300 border-amber-500/50' };
  } else if (diffDays > 1 && diffDays <= 14) {
    return { label: `In ${diffDays} Days`, color: 'bg-amber-500/20 text-amber-300 border-amber-500/50' };
  } else {
    const formattedDate = airDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { label: `Returns ${formattedDate}`, color: 'bg-slate-900/90 text-slate-300 border-slate-700' };
  }
}

export function UpcomingQueue({ watchlist, onSelectShow, onRemoveShow }) {
  const [scheduledShows, setScheduledShows] = useState([]);
  const [inProductionShows, setInProductionShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function processUpcoming() {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;

      const hydrated = await Promise.all(
        watchlist.map(async (show) => {
          const season = show.currentSeason || 1;
          const episode = show.currentEpisode || 1;

          try {
            // Fetch root show details to catch next_episode_to_air across ALL seasons
            const res = await fetch(
              `https://api.themoviedb.org/3/tv/${show.id}?api_key=${apiKey}`
            );
            const tmdbShow = await res.json();
            
            const nextEp = tmdbShow.next_episode_to_air;
            let epData = null;

            if (nextEp) {
              epData = nextEp;
            } else {
              // Fallback to checking state-based episode info
              epData = await getNextEpisodeInfo(show.id, season, episode);
            }

            const airDate = epData?.air_date || null;
            const isAired = airDate ? airDate <= todayStr : false;

            return {
              ...show,
              name: tmdbShow.name || show.name,
              backdrop: tmdbShow.backdrop_path || show.backdrop,
              poster: tmdbShow.poster_path || show.poster,
              network: tmdbShow.networks?.[0]?.name || show.network || 'Unknown Streamer',
              status: tmdbShow.status || show.status || 'Returning Series',
              airDate,
              isAired,
              nextEpSeason: epData?.season_number || season,
              nextEpNumber: epData?.episode_number || episode,
              episodeName: epData?.name || `Episode ${episode}`,
            };
          } catch (err) {
            console.error(`Failed fetching details for show ${show.id}`, err);
            return {
              ...show,
              airDate: null,
              isAired: false,
              nextEpSeason: season,
              nextEpNumber: episode,
              episodeName: `Episode ${episode}`,
            };
          }
        })
      );

      // 1. Shows with confirmed upcoming premiere dates
      const scheduled = hydrated.filter((s) => s.airDate && !s.isAired);
      scheduled.sort((a, b) => new Date(a.airDate) - new Date(b.airDate));

      // 2. Active shows awaiting an announced air date (Excludes Ended/Canceled)
      const pending = hydrated.filter(
        (s) =>
          !s.airDate &&
          (s.status === 'Returning Series' ||
            s.status === 'In Production' ||
            s.status === 'Planned')
      );

      setScheduledShows(scheduled);
      setInProductionShows(pending);
      setLoading(false);
    }

    if (watchlist.length > 0) {
      processUpcoming();
    } else {
      setScheduledShows([]);
      setInProductionShows([]);
      setLoading(false);
    }
  }, [watchlist]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-bold text-slate-500 animate-pulse">
        Fetching fall schedule from TMDB...
      </div>
    );
  }

  const totalCount = scheduledShows.length + inProductionShows.length;

  if (totalCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
        <p className="text-sm font-medium text-slate-400">No upcoming premieres found!</p>
        <p className="mt-1 text-xs text-slate-500">
          Shows with announced fall premiere dates will automatically show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CONFIRMED UPCOMING AIR DATES */}
      {scheduledShows.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Upcoming Premieres</span>
              <span className="bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full text-[10px]">
                {scheduledShows.length}
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {scheduledShows.map((show) => {
              const backdropUrl = show.backdrop
                ? `${IMAGE_BASE_URL}${show.backdrop}`
                : show.poster
                ? `${IMAGE_BASE_URL}${show.poster}`
                : '';
              const badge = getCountdownBadge(show.airDate);

              return (
                <div
                  key={show.id}
                  onClick={() => onSelectShow(show.id)}
                  className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-xl cursor-pointer hover:border-amber-400/50 transition-all"
                >
                  <div
                    className="relative h-44 bg-slate-900 bg-cover bg-top"
                    style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent"></div>

                    {/* Season/Episode & Network Badges */}
                    <div className="absolute top-3 left-3 flex flex-col items-start space-y-1 z-10">
                      <span className="rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-xs font-extrabold text-[#8CFA96] backdrop-blur-md shadow-md">
                        S{String(show.nextEpSeason).padStart(2, '0')} • E{String(show.nextEpNumber).padStart(2, '0')}
                      </span>
                      {show.network && (
                        <span className="rounded-md border border-slate-700/80 bg-slate-900/90 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-300 backdrop-blur-md shadow-md">
                          {show.network}
                        </span>
                      )}
                    </div>

                    {/* Countdown Badge */}
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className={`rounded-md border px-2.5 py-1 text-[10px] font-bold backdrop-blur-md shadow-md ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Remove Action */}
                    <button
                      type="button"
                      title="Remove show from watchlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveShow(show.id);
                      }}
                      className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-xs text-slate-400 hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-400 transition-all z-10"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="text-xs font-semibold text-slate-400 truncate">{show.name}</div>
                      <div className="mt-0.5 text-sm font-bold text-white truncate">
                        E{show.nextEpNumber}: {show.episodeName}
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/30 shrink-0">
                      Scheduled
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IN PRODUCTION / RENEWED */}
      {inProductionShows.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <span>In Production / Renewed</span>
              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">
                {inProductionShows.length}
              </span>
            </h2>
          </div>

          <div className="space-y-2">
            {inProductionShows.map((show) => {
              const posterUrl = show.poster ? `${IMAGE_BASE_URL}${show.poster}` : '';

              return (
                <div
                  key={show.id}
                  onClick={() => onSelectShow(show.id)}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#1E293B] p-2.5 hover:border-slate-700 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-3">
                    {posterUrl ? (
                      <img src={posterUrl} alt={show.name} className="h-12 w-9 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-9 rounded bg-slate-800 shrink-0 flex items-center justify-center text-[8px] text-slate-600">
                        No Image
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-white truncate">{show.name}</h3>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{show.network}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 shrink-0">
                    Awaiting Date
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}