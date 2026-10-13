import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getShowMetadata } from '../services/tmdb';
import retroVisionLogo from '../assets/retro-vision-logo.png';

export function MasterWatchlist({ 
  watchlist, 
  atticShows, 
  onSelectShow, 
  onRemoveShow, 
  onRemoveFromAttic, 
  onMoveToAttic, 
  onRestoreFromAttic 
}) {
  const [subTab, setSubTab] = useState('active'); // 'active' | 'attic'
  const [showsWithMeta, setShowsWithMeta] = useState([]);
  const [atticWithMeta, setAtticWithMeta] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [sortMode, setSortMode] = useState('az');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const FULL_ALPHABET = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','#'];

  const SORT_OPTIONS = [
    { id: 'az', label: 'Alphabetical (A-Z)' },
    { id: 'recent', label: 'Recently Added' },
    { id: 'network', label: 'By Network' },
    { id: 'episodes', label: 'Fewest Episodes' },
    { id: 'age-desc', label: 'Newest Series' },
    { id: 'age-asc', label: 'Oldest Series' },
    { id: 'completed', label: 'Completed Series Only' },
  ];

  // Hydrate metadata for Active Watchlist
  useEffect(() => {
    async function loadActiveMetadata() {
      const hydrated = await Promise.all(
        watchlist.map(async (show, index) => {
          const meta = await getShowMetadata(show.id);
          const airDate = meta?.first_air_date || meta?.firstAirDate || show.first_air_date;
          const isActuallyEnded = meta?.isEnded || meta?.status === 'Ended' || meta?.status === 'Canceled' || false;
          
          return {
            ...show,
            originalIndex: index,
            network: meta?.network || 'Unknown Streamer',
            isEnded: isActuallyEnded,
            numberOfEpisodes: meta?.numberOfEpisodes || 0,
            firstAirDate: airDate ? airDate : '9999-12-31', 
          };
        })
      );
      setShowsWithMeta(hydrated);
      setLoading(false);
    }

    if (watchlist.length > 0) {
      loadActiveMetadata();
    } else {
      setShowsWithMeta([]);
      setLoading(false);
    }
  }, [watchlist]);

  // Hydrate metadata for RetroVision
  useEffect(() => {
    async function loadAtticMetadata() {
      const hydrated = await Promise.all(
        atticShows.map(async (show, index) => {
          const meta = await getShowMetadata(show.id);
          const airDate = meta?.first_air_date || meta?.firstAirDate || show.first_air_date;
          const isActuallyEnded = meta?.isEnded || meta?.status === 'Ended' || meta?.status === 'Canceled' || false;
          
          return {
            ...show,
            originalIndex: index,
            network: meta?.network || show.network || 'Unknown Streamer',
            isEnded: isActuallyEnded,
            numberOfEpisodes: meta?.numberOfEpisodes || show.numberOfEpisodes || 0,
            firstAirDate: airDate ? airDate : '9999-12-31', 
          };
        })
      );
      setAtticWithMeta(hydrated);
    }

    if (atticShows.length > 0) {
      loadAtticMetadata();
    } else {
      setAtticWithMeta([]);
    }
  }, [atticShows]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-bold text-slate-500">
        Loading directory...
      </div>
    );
  }

  let processedShows = subTab === 'active' ? [...showsWithMeta] : [...atticWithMeta];
  
  if (sortMode === 'completed') {
    processedShows = processedShows.filter((s) => s.isEnded);
  }

  processedShows.sort((a, b) => {
    if (sortMode === 'recent') {
      return b.originalIndex - a.originalIndex;
    }
    if (sortMode === 'network') {
      const netA = a.network || '';
      const netB = b.network || '';
      const netCompare = netA.localeCompare(netB);
      if (netCompare !== 0) return netCompare;
      return (a.name || '').localeCompare(b.name || '');
    }
    if (sortMode === 'episodes') {
      return (a.numberOfEpisodes || 0) - (b.numberOfEpisodes || 0);
    }
    if (sortMode === 'age-asc') {
      return (a.firstAirDate).localeCompare(b.firstAirDate);
    }
    if (sortMode === 'age-desc') {
      return (b.firstAirDate).localeCompare(a.firstAirDate);
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  function handleSelectSort(id) {
    setSortMode(id);
    setIsDropdownOpen(false);
  }

  function scrollToLetter(targetLetter) {
    const startIndex = FULL_ALPHABET.indexOf(targetLetter);
    for (let i = startIndex; i < FULL_ALPHABET.length; i++) {
      const el = document.getElementById(`letter-${FULL_ALPHABET[i]}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    for (let i = startIndex - 1; i >= 0; i--) {
      const el = document.getElementById(`letter-${FULL_ALPHABET[i]}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  }

  const showAlphabetIndex = processedShows.length > 0 && ['az', 'completed'].includes(sortMode);

  return (
    <div className={`space-y-2 ${showAlphabetIndex ? 'pr-5' : ''}`}>
      {/* STICKY CONTROLS CONTAINER */}
     <div className="sticky top-[45px] z-30 bg-[#0F172A] -mt-[3px] pt-2 pb-2 space-y-2">
        {/* Clean Sub-Tab Header */}
        <div className="flex w-full items-center justify-evenly rounded-xl border border-slate-800 bg-[#1E293B] py-2.5 text-[11px] sm:text-xs font-bold shadow-md">
          <button
            onClick={() => setSubTab('active')}
            className={`flex items-center justify-center space-x-1 px-1.5 transition-colors ${
              subTab === 'active' 
                ? 'text-[#8CFA96]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>Active Shows ({showsWithMeta.length})</span>
          </button>

          <button
            onClick={() => setSubTab('attic')}
            className={`flex items-center justify-center space-x-1 px-2 transition-colors ${
              subTab === 'attic' 
                ? 'text-[#8CFA96]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <img src={retroVisionLogo} alt="RetroVision" className="h-4 w-4 object-contain shrink-0" />
            <span>RetroVision ({atticWithMeta.length})</span>
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="relative w-full space-y-2">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#1E293B] px-5 py-2.5 text-[11px] sm:text-xs font-semibold text-white transition-all hover:border-slate-700 shadow-md"
          >
            <span className="truncate">
              {SORT_OPTIONS.find((opt) => opt.id === sortMode)?.label}
            </span>
            <span className="ml-2 text-slate-400">{isDropdownOpen ? '▲' : '▼'}</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-800 bg-[#1E293B] shadow-2xl">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectSort(option.id)}
                  className={`flex w-full items-center justify-between px-3.5 py-1.5 text-xs font-bold transition-all border-b border-slate-800/50 last:border-0 ${
                    sortMode === option.id
                      ? 'bg-[#8CFA96]/10 text-[#8CFA96]'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{option.label}</span>
                  {sortMode === option.id && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DYNAMICALLY VERTICALLY CENTERED ALPHABET SIDE INDEX */}
      {showAlphabetIndex && (
        <div 
          style={{
            top: 'calc(50% - env(safe-area-inset-bottom, 0px) / 2)',
          }}
          className="fixed right-1 z-40 flex -translate-y-1/2 flex-col items-center justify-center py-2"
        >
          {FULL_ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => scrollToLetter(letter)}
              className="flex h-[3.4vh] max-h-4.5 min-h-[12px] w-4 items-center justify-center text-[8px] font-black text-slate-400 hover:text-[#8CFA96] transition-all active:scale-125"
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {/* SHOW LIST */}
      <div className="space-y-2">
        {processedShows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center mt-4">
            <p className="text-sm font-medium text-slate-400">
              {sortMode === 'completed'
                ? 'No completed series in this view'
                : subTab === 'active'
                ? 'No active shows in library'
                : 'RetroVision is empty'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {subTab === 'active'
                ? 'Tap "+ Add" above to start tracking shows'
                : 'Move completed or ended series to RetroVision'}
            </p>
          </div>
        ) : (
          processedShows.map((show, index) => {
            let currentLetter = (show.name || '#').charAt(0).toUpperCase();
            if (!/[A-Z]/.test(currentLetter)) currentLetter = '#';

            let prevLetter = null;
            if (index > 0) {
              prevLetter = (processedShows[index - 1].name || '#').charAt(0).toUpperCase();
              if (!/[A-Z]/.test(prevLetter)) prevLetter = '#';
            }

            const isFirstOfLetter = currentLetter !== prevLetter;

            return (
              <div
                key={show.id}
                id={showAlphabetIndex && isFirstOfLetter ? `letter-${currentLetter}` : undefined}
                className={showAlphabetIndex ? "scroll-mt-32" : ""}
              >
                <ShowCard
                  show={show}
                  sortMode={sortMode}
                  isAttic={subTab === 'attic'}
                  onSelectShow={onSelectShow}
                  onRemoveShow={onRemoveShow}
                  onRemoveFromAttic={onRemoveFromAttic}
                  onMoveToAttic={onMoveToAttic}
                  onRestoreFromAttic={onRestoreFromAttic}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ShowCard({ 
  show, 
  sortMode, 
  isAttic, 
  onSelectShow, 
  onRemoveShow, 
  onRemoveFromAttic, 
  onMoveToAttic, 
  onRestoreFromAttic 
}) {
  const posterUrl = show.poster_path || show.poster ? `${IMAGE_BASE_URL}${show.poster_path || show.poster}` : '';
  const premiereYear = show.firstAirDate && show.firstAirDate !== '9999-12-31' 
    ? show.firstAirDate.substring(0, 4) 
    : '';

  return (
    <div
      onClick={() => onSelectShow(show.id)}
      className="flex items-stretch justify-between gap-3 rounded-2xl border border-slate-800 bg-[#1E293B] p-2.5 shadow-md cursor-pointer hover:border-slate-700 transition-all overflow-hidden"
    >
      {/* Left Content (Image & Details) vertically centered */}
      <div className="flex items-center space-x-3 w-0 flex-1 py-0.5">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={show.name}
            className={`h-14 w-10 rounded-lg object-cover shrink-0 bg-slate-900 shadow ${isAttic ? 'opacity-80' : ''}`}
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
            {sortMode === 'episodes' && show.numberOfEpisodes > 0 && (
              <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.2 text-[9px] font-semibold text-slate-400 shrink-0">
                {show.numberOfEpisodes} EPs
              </span>
            )}
            {(sortMode === 'age-asc' || sortMode === 'age-desc') && premiereYear && (
              <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.2 text-[9px] font-semibold text-slate-400 shrink-0">
                Est. {premiereYear}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* NEW VERTICAL ACTION CLUSTER ON THE RIGHT EDGE */}
      <div className="flex flex-col justify-between items-end shrink-0 self-stretch pl-3 border-l border-slate-800/80 py-0.5">
       {/* Delete / Remove Icon - Nudged to the left */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isAttic) {
              onRemoveFromAttic(show.id);
            } else {
              onRemoveShow(show.id);
            }
          }}
          title="Remove permanently"
          // Added mr-1.5 here to push the icon to the left
          className="flex items-center justify-center text-rose-700 transition-transform active:scale-90 mr-1"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Restore/RetroVision Icon - Pushed strictly to Bottom Right */}
        {isAttic ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRestoreFromAttic(show);
            }}
            title="Restore to Active Watchlist"
            className="flex h-6 w-6 items-center justify-center text-[#8CFA96] transition-transform active:scale-90"
          >
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMoveToAttic(show);
            }}
            title="Move to RetroVision"
            className="flex h-6 w-6 items-center justify-center transition-transform active:scale-90"
          >
            <img src={retroVisionLogo} alt="Send to RetroVision" className="h-5.5 w-5.5 rounded object-cover" />
          </button>
        )}
      </div>
    </div>
  );
}