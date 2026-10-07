import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getNextEpisodeInfo } from '../services/tmdb';

export function UpcomingQueue({ watchlist, onSelectShow, onRemoveShow }) {
  const [upcomingShows, setUpcomingShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function filterUpcoming() {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const hydrated = await Promise.all(
        watchlist.map(async (show) => {
          const season = show.currentSeason || 1;
          const episode = show.currentEpisode || 1;
          const epData = await getNextEpisodeInfo(show.id, season, episode);
          const airDate = epData?.air_date || null;
          const isAired = airDate ? airDate <= today : false;

          return {
            ...show,
            airDate,
            isAired,
            episodeName: epData?.name || `Episode ${episode}`,
          };
        })
      );

      // Only show episodes that have NOT aired yet
      setUpcomingShows(hydrated.filter((s) => !s.isAired && s.airDate));
      setLoading(false);
    }

    if (watchlist.length > 0) {
      filterUpcoming();
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

  if (upcomingShows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
        <p className="text-sm font-medium text-slate-400">No upcoming unreleased episodes!</p>
        <p className="mt-1 text-xs text-slate-500">
          All your shows are either caught up or available in your Ready tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* CORRECT HEADER FOR UPCOMING TAB */}
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          Upcoming Releases ({upcomingShows.length})
        </h2>
        <span className="text-[10px] text-slate-500">Not Released Yet</span>
      </div>

      {upcomingShows.map((show) => {
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
            className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-xl cursor-pointer hover:border-amber-400/50 transition-all"
          >
            <div
              className="relative h-40 bg-slate-900 bg-cover bg-center"
              style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent"></div>

              <span className="absolute top-3 left-3 rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-xs font-extrabold text-[#8CFA96] backdrop-blur-md">
                S{String(season).padStart(2, '0')} • E{String(episode).padStart(2, '0')}
              </span>

              <span className="absolute bottom-3 left-3 rounded-md bg-amber-500/20 border border-amber-500/50 px-2.5 py-1 text-[10px] font-bold text-amber-300 backdrop-blur-md">
                Airs {show.airDate}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveShow(show.id);
                }}
                className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-[10px] text-slate-400 hover:text-red-400"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1 pr-3">
                <div className="text-xs font-semibold text-slate-400 truncate">{show.name}</div>
                <div className="mt-0.5 text-sm font-bold text-white truncate">
                  E{episode}: {show.episodeName}
                </div>
              </div>

              <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-700 shrink-0">
                Unreleased
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}