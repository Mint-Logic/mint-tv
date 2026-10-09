import React, { useState, useEffect, useRef } from 'react';
import { getShowDetails, IMAGE_BASE_URL } from '../services/tmdb';

export function ShowDetails({ showId, showData, onBack, onUpdateEpisode }) {
  const [details, setDetails] = useState(null);
  
  const [selectedSeason, setSelectedSeason] = useState(() => {
    const saved = localStorage.getItem(`mint_tv_season_${showId}`);
    if (saved) return Number(saved);
    return showData?.currentSeason || null;
  });

  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState(null);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [showGestureInfo, setShowGestureInfo] = useState(false);

  const activeSeasonRef = useRef(null);

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
        const targetSeason = selectedSeason || showData?.currentSeason || data.number_of_seasons || 1;
        if (!selectedSeason) {
          setSelectedSeason(targetSeason);
        }

        const apiKey = import.meta.env.VITE_TMDB_API_KEY;
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${showId}/season/${targetSeason}?api_key=${apiKey}`
        );
        const seasonData = await res.json();
        setEpisodes(seasonData.episodes || []);
      }
      setLoading(false);
    }
    fetchFullShow();
  }, [showId, selectedSeason]);

  // Smoothly scroll active season tab into view when selected season or episodes load
  useEffect(() => {
    if (activeSeasonRef.current) {
      activeSeasonRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedSeason, loading]);

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

  function toggleEpisodeWatched(epNumber, isWatched) {
    if (isWatched) {
      onUpdateEpisode(showId, selectedSeason, epNumber);
    } else {
      onUpdateEpisode(showId, selectedSeason, epNumber + 1);
    }
  }

  function handleMarkSeasonWatched() {
    if (episodes.length === 0) return;
    onUpdateEpisode(showId, selectedSeason, episodes.length + 1);
  }

  function handleMarkSeasonUnwatched() {
    if (episodes.length === 0) return;
    onUpdateEpisode(showId, selectedSeason, 1);
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
        className="relative z-0 min-h-[14rem] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl cursor-pointer"
      >
        {backdropUrl && (
          <img src={backdropUrl} alt={details.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/60 to-transparent"></div>
        <div className="relative p-4 pt-20 flex flex-col justify-end min-h-[14rem]">
          <div className="flex items-center space-x-2">
            <span className="self-start text-[9px] font-extrabold uppercase tracking-wider text-[#8CFA96] bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
              {details.status}
            </span>
            {details.networks && details.networks.length > 0 && (
              <span className="self-start text-[9px] font-extrabold uppercase tracking-wider text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                {details.networks[0].name}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-black text-white mt-1 truncate">{details.name}</h2>
          
          <p className={`text-xs text-slate-300 mt-1 transition-all ${isOverviewExpanded ? '' : 'line-clamp-2'}`}>
            {details.overview || 'No overview available.'}
          </p>
          
          <span className="text-[10px] text-[#8CFA96] font-semibold mt-1">
            {isOverviewExpanded ? 'Less ▲' : 'More ▼'}
          </span>
        </div>
      </div>

      {/* STICKY SEASON SELECTION TABS */}
      <div className="sticky top-[49px] z-30 bg-[#0F172A] py-2 border-b border-slate-800">
        <div className="flex space-x-2 overflow-x-auto pb-0.5 scrollbar-none touch-pan-x">
          {details.seasons
            ?.filter((s) => s.season_number > 0)
            .map((s) => {
              const isSelected = selectedSeason === s.season_number;
              return (
                <button
                  key={s.id}
                  ref={isSelected ? activeSeasonRef : null}
                  onClick={() => handleSeasonChange(s.season_number)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                    isSelected
                      ? 'bg-[#8CFA96] text-slate-900 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Season {s.season_number}
                </button>
              );
            })}
        </div>
      </div>

      {/* Episode Checklist */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1 relative">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Season {selectedSeason} Episodes ({episodes.length})
          </h3>

          <button
            onClick={() => setShowGestureInfo(!showGestureInfo)}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[10px] font-black text-slate-400 hover:border-[#8CFA96] hover:text-[#8CFA96] transition-all"
            title="Shortcut Info"
          >
            i
          </button>

          {showGestureInfo && (
            <div className="absolute right-0 top-7 w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl z-20 text-[11px] text-slate-300 space-y-1.5">
              <div className="flex justify-between items-center font-bold text-[#8CFA96]">
                <span>Season Shortcuts</span>
                <button onClick={() => setShowGestureInfo(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <p className="text-slate-400 leading-snug">
                <strong className="text-white">Tap 'Finale' Badge</strong> to mark all episodes in this season as watched.
              </p>
              <p className="text-slate-400 leading-snug">
                <strong className="text-white">Tap 'Premiere' Badge</strong> to mark all episodes in this season as unwatched.
              </p>
            </div>
          )}
        </div>

        {episodes.map((ep, index) => {
          const isFirstEpisode = index === 0;
          const isLastEpisode = index === episodes.length - 1;
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
                <div
                  onClick={() => setExpandedEpisodeId(isExpanded ? null : ep.id)}
                  className="flex-1 min-w-0 cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-wrap gap-y-1">
                    <span className="text-xs font-extrabold text-[#8CFA96] shrink-0">
                      E{String(ep.episode_number).padStart(2, '0')}
                    </span>
                    <span
                      className={`text-sm font-bold text-white min-w-0 ${
                        isExpanded ? 'whitespace-normal break-words' : 'truncate'
                      }`}
                    >
                      {ep.name}
                    </span>

                    {/* Premiere badge triggers Unwatch Season */}
                    {isFirstEpisode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkSeasonUnwatched();
                        }}
                        title="Click to reset season as unwatched"
                        className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-800/90 hover:bg-red-500/20 hover:text-red-400 px-1.5 py-0.5 rounded border border-slate-700 shrink-0 transition-all active:scale-95"
                      >
                        Premiere ↺
                      </button>
                    )}

                    {/* Finale badge triggers Watch All Season */}
                    {isLastEpisode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkSeasonWatched();
                        }}
                        title="Click to mark entire season watched"
                        className="text-[9px] font-black text-[#8CFA96] uppercase tracking-widest bg-[#8CFA96]/10 hover:bg-[#8CFA96]/20 px-1.5 py-0.5 rounded border border-[#8CFA96]/30 shrink-0 transition-all active:scale-95"
                      >
                        Finale ✓
                      </button>
                    )}
                  </div>

                  {!isExpanded && (
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 truncate">
                      {ep.overview || 'No overview available.'}
                    </p>
                  )}
                </div>

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