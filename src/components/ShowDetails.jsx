import React, { useState, useEffect } from 'react';
import { getShowDetails, IMAGE_BASE_URL } from '../services/tmdb';

export function ShowDetails({ showId, showData, onBack, onUpdateEpisode }) {
  const [details, setDetails] = useState(null);
  
  // Restore last selected season for this show from localStorage, fallback to currentSeason or S1
  const [selectedSeason, setSelectedSeason] = useState(() => {
    const saved = localStorage.getItem(`mint_tv_season_${showId}`);
    if (saved) return Number(saved);
    return showData?.currentSeason || 1;
  });

  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState(null);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

  // Save season selection whenever it changes
  function handleSeasonChange(seasonNumber) {
    setSelectedSeason(seasonNumber);
    localStorage.setItem(`mint_tv_season_${showId}`, seasonNumber);
  }

  useEffect(() => {
    async function fetchFullShow() {
      setLoading(true);
      const data = await getShowDetails(showId);
      setDetails(data);

      if (data) {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY;
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${showId}/season/${selectedSeason}?api_key=${apiKey}`
        );
        const seasonData = await res.json();
        setEpisodes(seasonData.episodes || []);
      }
      setLoading(false);
    }
    fetchFullShow();
  }, [showId, selectedSeason]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm font-medium">
        Loading show details from TMDB...
      </div>
    );
  }

  if (!details) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm font-medium space-y-3">
        <p>Unable to load show details.</p>
        <button onClick={onBack} className="text-[#8CFA96] font-bold text-xs underline">
          Go Back
        </button>
      </div>
    );
  }

  const backdropUrl = details.backdrop_path ? `${IMAGE_BASE_URL}${details.backdrop_path}` : '';
  const currentSeason = showData?.currentSeason || 1;
  const currentEpisode = showData?.currentEpisode || 1;

  // Determine if every episode in the current season is watched
  const areAllSeasonEpisodesWatched =
    episodes.length > 0 &&
    (currentSeason > selectedSeason ||
      (currentSeason === selectedSeason && currentEpisode > episodes.length));

  function toggleEpisodeWatched(epNumber, isWatched) {
    if (isWatched) {
      onUpdateEpisode(showId, selectedSeason, epNumber);
    } else {
      onUpdateEpisode(showId, selectedSeason, epNumber + 1);
    }
  }

  function handleToggleAllSeasonEpisodes() {
    if (episodes.length === 0) return;

    if (areAllSeasonEpisodesWatched) {
      // Reset to episode 1 of current season
      onUpdateEpisode(showId, selectedSeason, 1);
    } else {
      // Mark all episodes watched in this season
      onUpdateEpisode(showId, selectedSeason, episodes.length + 1);
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-xs font-bold text-[#8CFA96] bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 transition-all"
      >
        <span>← Back to Queue</span>
      </button>

      {/* Hero Backdrop & Show Info */}
      <div 
        onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
        className="relative min-h-[14rem] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl cursor-pointer"
      >
        {backdropUrl && (
          <img src={backdropUrl} alt={details.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/60 to-transparent"></div>
        <div className="relative p-4 pt-20 flex flex-col justify-end min-h-[14rem]">
          <span className="self-start text-[10px] font-extrabold uppercase tracking-widest text-[#8CFA96] bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            {details.status}
          </span>
          <h2 className="text-2xl font-black text-white mt-1 truncate">{details.name}</h2>
          
          <p className={`text-xs text-slate-300 mt-1 transition-all ${isOverviewExpanded ? '' : 'line-clamp-2'}`}>
            {details.overview || 'No overview available.'}
          </p>
          
          <span className="text-[10px] text-[#8CFA96] font-semibold mt-1">
            {isOverviewExpanded ? 'Tap to collapse ▲' : 'Tap to expand overview ▼'}
          </span>
        </div>
      </div>

      {/* Season Selection Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-slate-800">
        {details.seasons
          ?.filter((s) => s.season_number > 0)
          .map((s) => (
            <button
              key={s.id}
              onClick={() => handleSeasonChange(s.season_number)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedSeason === s.season_number
                  ? 'bg-[#8CFA96] text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Season {s.season_number}
            </button>
          ))}
      </div>

      {/* Episode Checklist */}
      <div className="space-y-3">
        {/* Section Header with Dynamic Toggle Action */}
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Season {selectedSeason} Episodes ({episodes.length})
          </h3>
          <button
            onClick={handleToggleAllSeasonEpisodes}
            className={`text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              areAllSeasonEpisodesWatched
                ? 'text-red-400 hover:text-red-300'
                : 'text-[#8CFA96] hover:text-white'
            }`}
          >
            {areAllSeasonEpisodesWatched
              ? 'Mark All Episodes Unwatched'
              : 'Mark All Episodes Watched'}
          </button>
        </div>

        {episodes.map((ep) => {
          const isWatched =
            currentSeason > selectedSeason ||
            (currentSeason === selectedSeason && currentEpisode > ep.episode_number);
          const isExpanded = expandedEpisodeId === ep.id;

          return (
            <div
              key={ep.id}
              className="bg-[#1E293B] border border-slate-800 rounded-xl p-3 shadow-md transition-all overflow-hidden"
            >
              <div className="flex justify-between items-start space-x-3 min-w-0">
                {/* Episode Text Info */}
                <div
                  onClick={() => setExpandedEpisodeId(isExpanded ? null : ep.id)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-start space-x-2 min-w-0">
                    <span className="text-xs font-extrabold text-[#8CFA96] shrink-0 mt-0.5">
                      E{String(ep.episode_number).padStart(2, '0')}
                    </span>
                    <span
                      className={`text-sm font-bold text-white min-w-0 ${
                        isExpanded ? 'whitespace-normal break-words' : 'truncate'
                      }`}
                    >
                      {ep.name}
                    </span>
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 truncate">
                      {ep.overview || 'No overview available.'}
                    </p>
                  )}
                </div>

                {/* Watched Toggle Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEpisodeWatched(ep.episode_number, isWatched);
                  }}
                  title={isWatched ? "Click to mark as Unwatched" : "Click to mark as Watched"}
                  aria-label={
                    isWatched
                      ? `Mark episode ${ep.episode_number} as unwatched`
                      : `Mark episode ${ep.episode_number} as watched`
                  }
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isWatched
                      ? 'bg-[#8CFA96] border-[#8CFA96] text-slate-900 font-bold'
                      : 'border-slate-600 text-slate-500 hover:border-[#8CFA96]'
                  }`}
                >
                  ✓
                </button>
              </div>

              {/* Expanded Synopsis Drawer */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg break-words">
                  <div className="font-semibold text-[#8CFA96] mb-1">
                    Air Date: {ep.air_date || 'N/A'}
                  </div>
                  {ep.overview || 'No detailed overview provided for this episode.'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}