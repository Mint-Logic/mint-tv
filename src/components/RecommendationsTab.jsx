import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getShowRecommendations } from '../services/tmdb';

export function RecommendationsTab({ watchlist, onAddShow }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState(new Set());
  const [expandedShowId, setExpandedShowId] = useState(null);

  useEffect(() => {
    async function fetchSmartRecommendations() {
      const activeWatchlist = watchlist.filter((s) => !s.archived);

      if (activeWatchlist.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const watchlistIds = new Set(watchlist.map((s) => s.id));

        const allResults = await Promise.all(
          activeWatchlist.map(async (show) => {
            const results = await getShowRecommendations(show.id);
            return { sourceName: show.name, results };
          })
        );

        const showMap = new Map();

        allResults.forEach(({ sourceName, results }) => {
          results.forEach((show) => {
            if (watchlistIds.has(show.id)) return;
            if (!show.vote_average || show.vote_average < 6.8) return;
            if (!show.vote_count || show.vote_count < 100) return;

            if (!showMap.has(show.id)) {
              showMap.set(show.id, {
                ...show,
                matchedSources: [sourceName],
                score: show.vote_average,
              });
            } else {
              const existing = showMap.get(show.id);
              if (!existing.matchedSources.includes(sourceName)) {
                existing.matchedSources.push(sourceName);
                existing.score += 2.0;
              }
            }
          });
        });

        const ranked = Array.from(showMap.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 15);

        setRecommendations(ranked);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      }
      setLoading(false);
    }

    fetchSmartRecommendations();
  }, [watchlist]);

  function handleAdd(show) {
    onAddShow({
      id: show.id,
      name: show.name,
      poster: show.poster_path,
      backdrop: show.backdrop_path,
      currentSeason: 1,
      currentEpisode: 1,
      completed: false,
    });

    setAddedIds((prev) => new Set(prev).add(show.id));
  }

  function isAdded(showId) {
    return watchlist.some((s) => s.id === showId) || addedIds.has(showId);
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-bold text-slate-500">
        Analyzing your full library for high-match shows...
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
        <p className="text-sm font-medium text-slate-400">No shows to base recommendations on!</p>
        <p className="mt-1 text-xs text-slate-500">
          Add a few shows to your library first to unlock personalized suggestions.
        </p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
        <p className="text-sm font-medium text-slate-400">No high-quality recommendations found!</p>
        <p className="mt-1 text-xs text-slate-500">
          Try adding a wider variety of shows to your active watchlist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-bold text-[#8CFA96] uppercase tracking-wider">
          Top Recommendations ({recommendations.length})
        </h2>
        <span className="text-[10px] text-slate-500">Tap row to view synopsis</span>
      </div>

      <div className="space-y-3">
        {recommendations.map((show) => {
          const added = isAdded(show.id);
          const posterUrl = show.poster_path ? `${IMAGE_BASE_URL}${show.poster_path}` : '';
          const matchCount = show.matchedSources.length;
          const isExpanded = expandedShowId === show.id;

          return (
            <div
              key={show.id}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-md transition-all hover:border-slate-700"
            >
              <div 
                onClick={() => setExpandedShowId(isExpanded ? null : show.id)}
                className="flex items-center justify-between p-3 cursor-pointer select-none"
              >
                <div className="flex items-center space-x-3.5 min-w-0 flex-1 pr-3">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={show.name}
                      className="h-16 w-12 rounded-lg object-cover shrink-0 bg-slate-900 shadow"
                    />
                  ) : (
                    <div className="h-16 w-12 rounded-lg bg-slate-900 shrink-0 flex items-center justify-center text-[10px] text-slate-600">
                      No Poster
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-sm font-extrabold text-white truncate leading-snug">{show.name}</h4>
                    
                    <div className="flex items-center space-x-2 text-[10px]">
                      <span className="text-amber-400 font-bold">★ {show.vote_average?.toFixed(1)}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 font-medium">
                        {show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="rounded bg-[#8CFA96]/15 border border-[#8CFA96]/30 px-2 py-0.5 text-[9px] font-extrabold text-[#8CFA96] truncate">
                        {matchCount > 1
                          ? `Matches ${matchCount} library shows`
                          : `Matches ${show.matchedSources[0]}`}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  disabled={added}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdd(show);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                    added
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-[#8CFA96] text-slate-900 hover:opacity-90 shadow-sm'
                  }`}
                >
                  {added ? 'Added ✓' : '+ Add'}
                </button>
              </div>

              {/* Expandable Overview Drawer */}
              {isExpanded && (
                <div className="border-t border-slate-800/80 bg-slate-900/70 p-3.5 text-xs text-slate-300 leading-relaxed">
                  <p className="font-semibold text-slate-200 mb-1">Overview</p>
                  <p>{show.overview || 'No synopsis provided for this title.'}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}