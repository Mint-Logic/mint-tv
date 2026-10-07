import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getShowRecommendations } from '../services/tmdb';

export function RecommendationsTab({ watchlist, onAddShow }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllRecommendations() {
      if (watchlist.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Pick up to 3 random shows from user's watchlist to base recommendations on
        const sampleShows = [...watchlist].sort(() => 0.5 - Math.random()).slice(0, 3);
        
        const recPromises = sampleShows.map(async (show) => {
          const results = await getShowRecommendations(show.id);
          return { baseShowName: show.name, results: results.slice(0, 4) };
        });

        const recData = await Promise.all(recPromises);
        setRecommendations(recData.filter((group) => group.results.length > 0));
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      }
      setLoading(false);
    }

    fetchAllRecommendations();
  }, [watchlist]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-bold text-slate-500">
        Analyzing your library to find recommendations...
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-bold text-[#8CFA96] uppercase tracking-wider">
          Recommended For You
        </h2>
        <span className="text-[10px] text-slate-500">Based on your library</span>
      </div>

      {recommendations.map((group, idx) => (
        <div key={idx} className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400">
            Because you track <span className="text-white font-bold">{group.baseShowName}</span>:
          </h3>

          <div className="space-y-3">
            {group.results.map((show) => {
              const isAlreadyAdded = watchlist.some((s) => s.id === show.id);
              const posterUrl = show.poster_path ? `${IMAGE_BASE_URL}${show.poster_path}` : '';

              return (
                <div
                  key={show.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#1E293B] p-3 shadow-md"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-3">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={show.name}
                        className="h-16 w-12 rounded-lg object-cover shrink-0 bg-slate-900"
                      />
                    ) : (
                      <div className="h-16 w-12 rounded-lg bg-slate-900 shrink-0 flex items-center justify-center text-[10px] text-slate-600">
                        No Poster
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate">{show.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        ★ {show.vote_average?.toFixed(1) || 'N/A'} • {show.first_air_date?.split('-')[0] || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isAlreadyAdded}
                    onClick={() =>
                      onAddShow({
                        id: show.id,
                        name: show.name,
                        poster: show.poster_path,
                        backdrop: show.backdrop_path,
                        currentSeason: 1,
                        currentEpisode: 1,
                        completed: false,
                      })
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                      isAlreadyAdded
                        ? 'bg-slate-800 text-slate-500 border border-slate-700'
                        : 'bg-[#8CFA96] text-slate-900 hover:opacity-90'
                    }`}
                  >
                    {isAlreadyAdded ? 'Added' : '+ Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}