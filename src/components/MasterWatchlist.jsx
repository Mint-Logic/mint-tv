import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getShowMetadata } from '../services/tmdb';

export function MasterWatchlist({ watchlist, onSelectShow, onRemoveShow, onToggleArchive, onRewatchShow }) {
  const [subTab, setSubTab] = useState('active'); // 'active' | 'archive'
  const [showsWithMeta, setShowsWithMeta] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const FULL_ALPHABET = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','#'];

  useEffect(() => {
    async function loadMetadata() {
      // Intentionally omitting setLoading(true) here so the list doesn't jump when removing shows
      const hydrated = await Promise.all(
        watchlist.map(async (show) => {
          const meta = await getShowMetadata(show.id);
          return {
            ...show,
            network: meta?.network || 'Unknown Streamer',
            status: meta?.status || 'Active',
            genres: meta?.genres || [],
          };
        })
      );
      setShowsWithMeta(hydrated);
      setLoading(false);
    }

    if (watchlist.length > 0) {
      loadMetadata();
    } else {
      setShowsWithMeta([]);
      setLoading(false);
    }
  }, [watchlist]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-bold text-slate-500">
        Loading show directory...
      </div>
    );
  }

  const availableGenres = Array.from(
    new Set(showsWithMeta.flatMap((s) => s.genres || []))
  ).sort();

  function toggleGenre(genre) {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  }

  function clearGenres() {
    setSelectedGenres([]);
  }

  // Filter and sort the shows
  const filteredShows = showsWithMeta
    .filter((s) => (subTab === 'active' ? !s.archived : s.archived))
    .filter((s) => {
      if (selectedGenres.length === 0) return true;
      return selectedGenres.some((g) => s.genres?.includes(g));
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  function scrollToLetter(targetLetter) {
    const startIndex = FULL_ALPHABET.indexOf(targetLetter);
    
    // Look forward for the closest existing letter
    for (let i = startIndex; i < FULL_ALPHABET.length; i++) {
      const el = document.getElementById(`letter-${FULL_ALPHABET[i]}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    
    // If no letters ahead, look backward
    for (let i = startIndex - 1; i >= 0; i--) {
      const el = document.getElementById(`letter-${FULL_ALPHABET[i]}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  }

  const activeCount = showsWithMeta.filter((s) => !s.archived).length;
  const archivedCount = showsWithMeta.filter((s) => s.archived).length;

  return (
    <div className="space-y-4">
      {/* Sub-Tab Toggle Bar */}
      <div className="flex rounded-xl border border-slate-800 bg-[#1E293B] p-1 text-xs font-bold">
        <button
          onClick={() => setSubTab('active')}
          className={`flex-1 rounded-lg py-2 transition-all ${
            subTab === 'active'
              ? 'bg-slate-800 text-[#8CFA96] shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Active Shows ({activeCount})
        </button>
        <button
          onClick={() => setSubTab('archive')}
          className={`flex-1 rounded-lg py-2 transition-all ${
            subTab === 'archive'
              ? 'bg-slate-800 text-[#8CFA96] shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Archived Shows ({archivedCount})
        </button>
      </div>

      {/* Multi-Select Genre Dropdown */}
      <div className="relative w-full space-y-2">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#1E293B] px-3.5 py-2.5 text-xs font-semibold text-white transition-all hover:border-slate-700"
        >
          <span className="truncate">
            {selectedGenres.length === 0
              ? 'Filter by Genres (All)'
              : `Genres (${selectedGenres.length} selected)`}
          </span>
          <span className="ml-2 text-slate-400">{isDropdownOpen ? '▲' : '▼'}</span>
        </button>

        {isDropdownOpen && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-800 bg-[#1E293B] p-2 shadow-2xl space-y-1">
            <div className="flex justify-between items-center px-2 py-1 text-[10px] text-slate-400 border-b border-slate-800 pb-1.5 mb-1">
              <span>Select Genres</span>
              {selectedGenres.length > 0 && (
                <button
                  onClick={clearGenres}
                  className="text-[#8CFA96] hover:underline font-bold"
                >
                  Clear All
                </button>
              )}
            </div>

            {availableGenres.length === 0 ? (
              <p className="p-2 text-center text-xs text-slate-500">No genre data available</p>
            ) : (
              availableGenres.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#8CFA96]/15 text-[#8CFA96]'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{genre}</span>
                    {isSelected && <span>✓</span>}
                  </button>
                );
              })
            )}
          </div>
        )}

        {selectedGenres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedGenres.map((genre) => (
              <span
                key={genre}
                className="inline-flex items-center space-x-1 rounded-md border border-[#8CFA96]/30 bg-[#8CFA96]/10 px-2 py-0.5 text-[10px] font-bold text-[#8CFA96]"
              >
                <span>{genre}</span>
                <button
                  onClick={() => toggleGenre(genre)}
                  className="ml-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Floating Vertical Full Alphabet Side Index */}
      {filteredShows.length > 0 && (
        <div className="fixed right-1 bottom-14 z-40 flex flex-col items-center justify-center">
          {FULL_ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => scrollToLetter(letter)}
              className="flex h-3.5 w-4 items-center justify-center text-[8px] font-black text-slate-400 hover:text-[#8CFA96] transition-all active:scale-95"
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {/* SHOW LIST */}
      <div className={`space-y-3 ${filteredShows.length > 0 ? 'pr-6' : ''}`}>
        {filteredShows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center mt-4">
            <p className="text-sm font-medium text-slate-400">
              {selectedGenres.length > 0
                ? 'No shows match all selected genres'
                : subTab === 'active'
                ? 'No active shows in library'
                : 'Archive Vault is empty'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedGenres.length > 0
                ? 'Try clearing or selecting different genres'
                : 'Tap "+ Add" above to start tracking shows'}
            </p>
          </div>
        ) : (
          filteredShows.map((show, index) => {
            // Check if this show is the first one to start with its letter
            let currentLetter = (show.name || '#').charAt(0).toUpperCase();
            if (!/[A-Z]/.test(currentLetter)) currentLetter = '#';

            let prevLetter = null;
            if (index > 0) {
              prevLetter = (filteredShows[index - 1].name || '#').charAt(0).toUpperCase();
              if (!/[A-Z]/.test(prevLetter)) prevLetter = '#';
            }

            const isFirstOfLetter = currentLetter !== prevLetter;

            return (
              <div
                key={show.id}
                id={isFirstOfLetter ? `letter-${currentLetter}` : undefined}
                className="scroll-mt-32"
              >
                <ShowCard
                  show={show}
                  onSelectShow={onSelectShow}
                  onRemoveShow={onRemoveShow}
                  onToggleArchive={onToggleArchive}
                  onRewatchShow={onRewatchShow}
                  isArchived={subTab === 'archive'}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ShowCard({ show, onSelectShow, onRemoveShow, onToggleArchive, onRewatchShow, isArchived }) {
  const posterUrl = show.poster ? `${IMAGE_BASE_URL}${show.poster}` : '';

  return (
    <div
      onClick={() => onSelectShow(show.id)}
      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#1E293B] p-2.5 shadow-md cursor-pointer hover:border-slate-700 transition-all overflow-hidden"
    >
      <div className="flex items-center space-x-3 w-0 flex-1">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={show.name}
            className="h-14 w-10 rounded-lg object-cover shrink-0 bg-slate-900 shadow"
          />
        ) : (
          <div className="h-14 w-10 rounded-lg bg-slate-900 shrink-0 flex items-center justify-center text-[9px] text-slate-600">
            No Image
          </div>
        )}

        <div className="w-0 flex-1 space-y-1">
          <h3 
            className="text-xs font-extrabold text-white leading-snug"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              whiteSpace: 'normal'
            }}
          >
            {show.name}
          </h3>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-[#8CFA96]/15 border border-[#8CFA96]/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-[#8CFA96] shrink-0">
              {show.network}
            </span>
            {show.isRewatching && (
              <span className="rounded bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-amber-400 shrink-0">
                Rewatching
              </span>
            )}
            {show.genres?.[0] && (
              <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.2 text-[9px] font-semibold text-slate-400 shrink-0">
                {show.genres[0]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Compact Action Buttons */}
      <div className="flex items-center space-x-1.5 shrink-0 self-center pl-1 border-l border-slate-800/80">
        {isArchived && onRewatchShow && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRewatchShow(show.id);
            }}
            title="Rewatch from S01E01"
            className="flex items-center space-x-1 rounded-lg border border-[#8CFA96]/40 bg-[#8CFA96]/10 px-2 py-1.5 text-[10px] font-bold text-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-900 transition-all active:scale-95"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden xs:inline">Rewatch</span>
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleArchive(show.id);
          }}
          title={isArchived ? "Restore to Active Watchlist" : "Move to Archive Vault"}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-300 hover:border-[#8CFA96] hover:text-[#8CFA96] transition-all active:scale-90"
        >
          {isArchived ? (
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemoveShow(show.id);
          }}
          title="Remove show permanently"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-[10px] text-slate-400 hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-90"
        >
          ✕
        </button>
      </div>
    </div>
  );
}