import React from 'react';
import { IMAGE_BASE_URL } from '../../services/tmdb';

export function MovieDetails({
  movie,
  onBack,
  onToggleWatched,
  onRemoveMovie,
}) {
  if (!movie) return null;

  const backdropUrl = movie.backdrop
    ? `${IMAGE_BASE_URL}${movie.backdrop}`
    : movie.poster
    ? `${IMAGE_BASE_URL}${movie.poster}`
    : '';

  const posterUrl = movie.poster ? `${IMAGE_BASE_URL}${movie.poster}` : '';

  // Construct Outbound Links
  const imdbUrl = movie.imdbId
    ? `https://www.imdb.com/title/${movie.imdbId}/`
    : `https://www.imdb.com/find?q=${encodeURIComponent(movie.title)}`;

  const rtSearchUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.title)}`;

  const flatrate = movie.providers?.flatrate || [];
  const free = movie.providers?.free || [];
  const rent = movie.providers?.rent || [];
  const buy = movie.providers?.buy || [];

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between py-2 border-b border-slate-800">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Movies</span>
        </button>

        <button
          onClick={() => {
            onRemoveMovie(movie.id);
            onBack();
          }}
          type="button"
          className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
        >
          Remove Movie
        </button>
      </div>

      {/* Backdrop & Primary Banner */}
      <div className="relative h-56 w-full rounded-2xl bg-slate-900 overflow-hidden border border-slate-800 shadow-xl">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-slate-950/40 to-transparent" />

        {/* Floating Quick Action: Watched Checkmark */}
        <div className="absolute bottom-3 right-3 flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onToggleWatched(movie.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all ${
              movie.isWatched
                ? 'bg-[#8CFA96] text-slate-950 border border-[#8CFA96]'
                : 'bg-slate-900/90 text-slate-200 border border-slate-700 hover:border-[#8CFA96]'
            }`}
          >
            <span>✓</span>
            <span>{movie.isWatched ? 'In RetroVision' : 'Mark as Watched'}</span>
          </button>
        </div>
      </div>

      {/* Title, Year, Meta and Outbound Rating Chips */}
      <div className="flex gap-4 items-start pt-1">
        {posterUrl && (
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-20 h-28 object-cover rounded-xl border border-slate-800 shadow-lg shrink-0 -mt-10 relative z-10 bg-slate-900"
          />
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          <h1 className="text-xl font-black text-white leading-tight">
            {movie.title}
          </h1>

          {/* Meta Information Bar */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 font-semibold">
            <span>{movie.releaseYear || 'TBA'}</span>
            <span>•</span>
            <span>{movie.runtimeFormatted}</span>
            <span>•</span>
            <span className="border border-slate-700 bg-slate-800/60 px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-200">
              {movie.mpaaRating || 'NR'}
            </span>
            {movie.tmdbRating && (
              <>
                <span>•</span>
                <span className="text-[#8CFA96] font-bold">★ {movie.tmdbRating}</span>
              </>
            )}
          </div>

          {/* External Links Chips: IMDb & Rotten Tomatoes */}
          <div className="flex items-center gap-2 pt-1">
            <a
              href={imdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#F5C518]/15 border border-[#F5C518]/50 text-[#F5C518] text-[11px] font-black hover:bg-[#F5C518] hover:text-black transition-all"
            >
              <span>IMDb</span>
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <a
              href={rtSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-red-500/15 border border-red-500/50 text-red-400 text-[11px] font-black hover:bg-red-500 hover:text-white transition-all"
            >
              <span>Rotten Tomatoes</span>
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Lead Actors Subline (Option B) */}
      {movie.leadActors && movie.leadActors.length > 0 && (
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Starring
          </p>
          <p className="text-xs font-semibold text-slate-200">
            {movie.leadActors.join('  •  ')}
          </p>
        </div>
      )}

      {/* Plot Overview */}
      {movie.overview && (
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-3.5 space-y-1.5">
          <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
            Overview
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {movie.overview}
          </p>
        </div>
      )}

      {/* Streaming & Availability Breakdown */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-3.5 space-y-3">
        <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
          Where to Watch
        </h2>

        {/* Subscription / Flatrate */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Subscription (Free to Stream)
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {flatrate.length > 0 || free.length > 0 ? (
              <>
                {flatrate.map((p) => (
                  <span
                    key={`flatrate-${p.id}`}
                    className="px-2 py-1 bg-[#8CFA96]/15 border border-[#8CFA96]/40 text-[#8CFA96] text-xs font-bold rounded-md"
                  >
                    {p.name}
                  </span>
                ))}
                {free.map((p) => (
                  <span
                    key={`free-${p.id}`}
                    className="px-2 py-1 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-bold rounded-md"
                  >
                    {p.name} (Free/Ads)
                  </span>
                ))}
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">Not currently streaming on subscription.</span>
            )}
          </div>
        </div>

        {/* Rent / Buy */}
        <div className="border-t border-slate-800 pt-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Rent or Purchase
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {rent.length > 0 || buy.length > 0 ? (
              Array.from(new Set([...rent.map((p) => p.name), ...buy.map((p) => p.name)])).map((name) => (
                <span
                  key={`store-${name}`}
                  className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium rounded-md"
                >
                  {name}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No digital rental/purchase options listed.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}