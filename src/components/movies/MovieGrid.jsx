import React, { useState, useMemo } from 'react';
import { IMAGE_BASE_URL } from '../../services/tmdb';
import retroVisionLogo from '../../assets/retro-vision-logo.png';

function getReleaseStatus(releaseDateStr) {
  if (!releaseDateStr) return null;
  const target = new Date(`${releaseDateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = target.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (diffDays <= 0) return { label: 'Released', sub: formattedDate, isFuture: false };
  if (diffDays === 1) return { label: 'Releases Tomorrow', sub: formattedDate, isFuture: true };
  if (diffDays <= 30) return { label: `In ${diffDays} days`, sub: formattedDate, isFuture: true };
  return { label: formattedDate, sub: `In ${diffDays} days`, isFuture: true };
}

export function MovieGrid({
  activeTab,
  movies,
  onToggleWatched,
  onRemoveMovie,
  onSelectMovie,
}) {
  const [selectedStreamer, setSelectedStreamer] = useState('all');

  const today = new Date().toISOString().split('T')[0];

  const unwatchedMovies = movies.filter((m) => !m.isWatched);
  const releasedMovies = unwatchedMovies.filter((m) => !m.releaseDate || m.releaseDate <= today);
  const upcomingMovies = useMemo(() => {
    return unwatchedMovies
      .filter((m) => m.releaseDate && m.releaseDate > today)
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  }, [unwatchedMovies, today]);

  const watchedMovies = movies.filter((m) => m.isWatched);

  // Extract unique streaming services with normalized brand grouping
  const availableStreamers = useMemo(() => {
    const providerMap = new Map();

    releasedMovies.forEach((movie) => {
      const flatrate = movie.providers?.flatrate || [];
      const free = movie.providers?.free || [];
      const combined = [...flatrate, ...free];

      combined.forEach((p) => {
        let cleanName = p.name;

        // Group sub-tiers, ad-plans, and provider add-ons to clean brand names
        if (/^Peacock/i.test(cleanName)) cleanName = 'Peacock';
        else if (/^Paramount/i.test(cleanName)) cleanName = 'Paramount+';
        else if (/^(Max|HBO)/i.test(cleanName)) cleanName = 'Max';
        else if (/^Netflix/i.test(cleanName)) cleanName = 'Netflix';
        else if (/^(Amazon Prime|Prime Video)/i.test(cleanName)) cleanName = 'Prime Video';
        else if (/^Hulu/i.test(cleanName)) cleanName = 'Hulu';
        else if (/^Disney/i.test(cleanName)) cleanName = 'Disney+';
        else if (/^Apple TV/i.test(cleanName)) cleanName = 'Apple TV+';

        const key = cleanName;

        if (!providerMap.has(key)) {
          providerMap.set(key, { id: p.id, name: cleanName, count: 0, rawIds: new Set() });
        }
        const entry = providerMap.get(key);
        entry.rawIds.add(p.id);
      });
    });

    // Count unique movies per normalized brand
    providerMap.forEach((entry) => {
      entry.count = releasedMovies.filter((m) => {
        const flatrate = m.providers?.flatrate || [];
        const free = m.providers?.free || [];
        return [...flatrate, ...free].some((p) => entry.rawIds.has(p.id));
      }).length;
    });

    return Array.from(providerMap.values()).sort((a, b) => b.count - a.count);
  }, [releasedMovies]);

  // Count rent/buy only films from released movies
  const rentBuyCount = useMemo(() => {
    return releasedMovies.filter((m) => {
      const hasStream = (m.providers?.flatrate || []).length > 0 || (m.providers?.free || []).length > 0;
      const hasRentOrBuy = (m.providers?.rent || []).length > 0 || (m.providers?.buy || []).length > 0;
      return !hasStream && hasRentOrBuy;
    }).length;
  }, [releasedMovies]);

  // Determine which movies to display for the active tab
  const displayList = useMemo(() => {
    if (activeTab === 'watchlist') {
      return watchedMovies;
    }

    if (activeTab === 'upcoming') {
      return upcomingMovies;
    }

    // Tab 1 (Ready/Watchlist): Released movies with streamer filter applied
    if (selectedStreamer === 'all') {
      return releasedMovies;
    }

    if (selectedStreamer === 'rent_buy') {
      return releasedMovies.filter((m) => {
        const hasStream = (m.providers?.flatrate || []).length > 0 || (m.providers?.free || []).length > 0;
        const hasRentOrBuy = (m.providers?.rent || []).length > 0 || (m.providers?.buy || []).length > 0;
        return !hasStream && hasRentOrBuy;
      });
    }

    const activeStreamerObj = availableStreamers.find((s) => s.id === selectedStreamer);

    return releasedMovies.filter((m) => {
      const flatrate = m.providers?.flatrate || [];
      const free = m.providers?.free || [];
      const movieProviderIds = [...flatrate, ...free].map((p) => p.id);

      if (activeStreamerObj?.rawIds) {
        return movieProviderIds.some((id) => activeStreamerObj.rawIds.has(id));
      }

      return movieProviderIds.includes(selectedStreamer);
    });
  }, [activeTab, releasedMovies, upcomingMovies, watchedMovies, selectedStreamer, availableStreamers]);

  return (
    <div className="space-y-3">
      {/* ================= TAB 1: DYNAMIC STREAMER SELECTOR PILLS ================= */}
      {activeTab === 'ready' && (
        <div className="sticky top-[45px] z-30 bg-[#0F172A] -mt-[3px] pt-3 pb-2">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setSelectedStreamer('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                selectedStreamer === 'all'
                  ? 'bg-[#1E293B] border border-[#8CFA96]/40 text-[#8CFA96] shadow-sm'
                  : 'bg-[#1E293B] border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              All ({releasedMovies.length})
            </button>

            {availableStreamers.map((streamer) => (
              <button
                key={streamer.id}
                type="button"
                onClick={() => setSelectedStreamer(streamer.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                  selectedStreamer === streamer.id
                    ? 'bg-[#1E293B] border border-[#8CFA96]/40 text-[#8CFA96] shadow-sm'
                    : 'bg-[#1E293B] border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {streamer.name} ({streamer.count})
              </button>
            ))}

            {rentBuyCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedStreamer('rent_buy')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                  selectedStreamer === 'rent_buy'
                    ? 'bg-[#1E293B] border border-[#8CFA96]/40 text-[#8CFA96] shadow-sm'
                    : 'bg-[#1E293B] border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Rent / Buy ({rentBuyCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: RETROVISION HEADER ================= */}
      {activeTab === 'watchlist' && (
        <div className="sticky top-[45px] z-30 bg-[#0F172A] -mt-[3px] pt-3 pb-2">
          <div className="flex w-full items-center justify-center space-x-2 rounded-xl border border-slate-800 bg-[#1E293B] py-2 text-xs font-bold shadow-md text-[#8CFA96]">
            <img src={retroVisionLogo} alt="RetroVision" className="h-4 w-4 object-contain shrink-0" />
            <span>RetroVision ({watchedMovies.length} Watched)</span>
          </div>
        </div>
      )}

      {/* ================= MOVIE LIST ================= */}
      {displayList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 py-16 px-4 text-center mt-4">
          <p className="text-sm font-semibold text-slate-300">
            {activeTab === 'watchlist'
              ? 'No movies logged in RetroVision yet.'
              : activeTab === 'upcoming'
              ? 'No upcoming releases in your queue.'
              : selectedStreamer !== 'all'
              ? 'No movies found on this service.'
              : 'Your watchlist is empty.'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {activeTab === 'upcoming'
              ? 'Movies with future theatrical or streaming release dates will appear here.'
              : activeTab === 'watchlist'
              ? 'Tap the checkmark on any movie to archive it here.'
              : 'Tap "+ Add Movie" in the top bar to track films.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map((movie) => {
            const backdropUrl = movie.backdrop
              ? `${IMAGE_BASE_URL}${movie.backdrop}`
              : movie.poster
              ? `${IMAGE_BASE_URL}${movie.poster}`
              : '';

            const isFutureFilm = movie.releaseDate && movie.releaseDate > today;
            const releaseInfo = getReleaseStatus(movie.releaseDate);

            const matchedStreamer = (movie.providers?.flatrate || [])
              .concat(movie.providers?.free || [])
              .find((p) => p.id === selectedStreamer);

            const rawStreamerName =
              matchedStreamer?.name ||
              movie.providers?.flatrate?.[0]?.name ||
              movie.providers?.free?.[0]?.name;

            let displayStreamerName = rawStreamerName;
            if (rawStreamerName) {
              if (/^Peacock/i.test(rawStreamerName)) displayStreamerName = 'Peacock';
              else if (/^Paramount/i.test(rawStreamerName)) displayStreamerName = 'Paramount+';
              else if (/^(Max|HBO)/i.test(rawStreamerName)) displayStreamerName = 'Max';
              else if (/^Netflix/i.test(rawStreamerName)) displayStreamerName = 'Netflix';
              else if (/^(Amazon Prime|Prime Video)/i.test(rawStreamerName)) displayStreamerName = 'Prime Video';
              else if (/^Hulu/i.test(rawStreamerName)) displayStreamerName = 'Hulu';
              else if (/^Disney/i.test(rawStreamerName)) displayStreamerName = 'Disney+';
              else if (/^Apple TV/i.test(rawStreamerName)) displayStreamerName = 'Apple TV+';
            }

            const primaryStreamer =
              displayStreamerName ||
              (movie.providers?.rent?.[0] ? `Rent: ${movie.providers.rent[0].name}` : isFutureFilm ? 'Upcoming' : 'In Theaters');

            return (
              <div
                key={movie.id}
                className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all"
              >
                {/* Backdrop Banner */}
                <div
                  onClick={() => onSelectMovie && onSelectMovie(movie.id)}
                  className="relative h-44 w-full bg-slate-900 cursor-pointer overflow-hidden"
                >
                  {backdropUrl && (
                    <img
                      src={backdropUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-black/40" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-3 right-3 flex justify-between items-center z-10">
                    {activeTab === 'upcoming' && releaseInfo ? (
                      <span className="inline-flex items-center space-x-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#8CFA96] bg-slate-950/90 px-2.5 py-1 rounded-md border border-[#8CFA96]/40 shadow-md">
                        <svg className="h-3 w-3 fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
                        </svg>
                        <span>{releaseInfo.label} • {releaseInfo.sub}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8CFA96] bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                        {primaryStreamer}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveMovie(movie.id);
                      }}
                      title="Remove Movie"
                      aria-label="Remove Movie"
                      className="text-slate-400 hover:text-red-400 bg-slate-950/80 hover:bg-slate-900 p-1 rounded-full border border-slate-800 transition-all text-xs w-6 h-6 flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3.5 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h3
                        onClick={() => onSelectMovie && onSelectMovie(movie.id)}
                        className="text-base font-black text-white truncate cursor-pointer hover:text-[#8CFA96] transition-colors"
                      >
                        {movie.title}
                      </h3>

                      {movie.leadActors && movie.leadActors.length > 0 && (
                        <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                          {movie.leadActors.join(' • ')}
                        </p>
                      )}

                      {movie.overview && (
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mt-1">
                          {movie.overview}
                        </p>
                      )}

                      <div className="flex items-center space-x-2 text-[11px] text-slate-300 font-semibold mt-1">
                        <span>{movie.releaseDate || movie.releaseYear || 'TBA'}</span>
                        <span>•</span>
                        <span>{movie.runtimeFormatted}</span>
                        <span>•</span>
                        <span className="border border-slate-700 px-1 rounded text-[9px] uppercase font-bold text-slate-300">
                          {movie.mpaaRating || 'NR'}
                        </span>
                        {movie.tmdbRating && (
                          <>
                            <span>•</span>
                            <span className="text-[#8CFA96]">★ {movie.tmdbRating}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Watched Action Button */}
                    <button
                      type="button"
                      onClick={() => onToggleWatched(movie.id)}
                      title={movie.isWatched ? 'Return to Watchlist' : 'Mark as Watched'}
                      aria-label={movie.isWatched ? 'Return to Watchlist' : 'Mark as Watched'}
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        movie.isWatched
                          ? 'bg-[#8CFA96] border-[#8CFA96] text-slate-900 font-bold'
                          : 'border-slate-500 text-slate-300 hover:border-[#8CFA96]'
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attribution Footer */}
      <footer className="pt-8 pb-20 flex flex-col items-center justify-center gap-2.5 text-center">
        <div className="flex items-center justify-center gap-3">
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="The Movie Database"
            className="inline-flex items-center opacity-85 hover:opacity-100 transition-opacity"
          >
            <img src="/tmdb-logo.svg" alt="TMDB Logo" className="h-3.5 w-auto object-contain" />
          </a>
          <span className="text-slate-600 text-xs">•</span>
          <span className="text-[11px] font-bold text-[#8CFA96]">JustWatch</span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400 max-w-[320px]">
          This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming data powered by JustWatch.
        </p>
      </footer>
    </div>
  );
}

export default MovieGrid;