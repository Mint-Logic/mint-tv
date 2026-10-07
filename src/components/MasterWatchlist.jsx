import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL, getShowMetadata } from '../services/tmdb';

export function MasterWatchlist({ watchlist, onSelectShow, onRemoveShow, onToggleArchive, onRewatchShow }) {
  const [subTab, setSubTab] = useState('active'); // 'active' | 'archive'
  const [showsWithMeta, setShowsWithMeta] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetadata() {
      setLoading(true);
      const hydrated = await Promise.all(
        watchlist.map(async (show) => {
          const meta = await getShowMetadata(show.id);
          return {
            ...show,
            network: meta?.network || 'Unknown Streamer',
            status: meta?.status || 'Active',
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

  const activeShows = showsWithMeta.filter((s) => !s.archived);
  const archivedShows = showsWithMeta.filter((s) => s.archived);

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
          Active Shows ({activeShows.length})
        </button>
        <button
          onClick={() => setSubTab('archive')}
          className={`flex-1 rounded-lg py-2 transition-all ${
            subTab === 'archive'
              ? 'bg-slate-800 text-[#8CFA96] shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Archived Shows ({archivedShows.length})
        </button>
      </div>

      {/* ACTIVE SHOWS TAB */}
      {subTab === 'active' && (
        <div className="space-y-3">
          {activeShows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
              <p className="text-sm font-medium text-slate-400">No active shows in your library!</p>
              <p className="mt-1 text-xs text-slate-500">
                Tap "+ Add" above to start tracking new shows.
              </p>
            </div>
          ) : (
            activeShows.map((show) => (
              <ShowCard
                key={show.id}
                show={show}
                onSelectShow={onSelectShow}
                onRemoveShow={onRemoveShow}
                onToggleArchive={onToggleArchive}
              />
            ))
          )}
        </div>
      )}

      {/* ARCHIVE VAULT TAB */}
      {subTab === 'archive' && (
        <div className="space-y-3">
          {archivedShows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 py-12 px-4 text-center">
              <p className="text-sm font-medium text-slate-400">Your Archive Vault is empty!</p>
              <p className="mt-1 text-xs text-slate-500">
                Tap the 📦 icon on finished shows in your Watchlist to store them here.
              </p>
            </div>
          ) : (
            archivedShows.map((show) => (
              <ShowCard
                key={show.id}
                show={show}
                onSelectShow={onSelectShow}
                onRemoveShow={onRemoveShow}
                onToggleArchive={onToggleArchive}
                onRewatchShow={onRewatchShow}
                isArchived={true}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ShowCard({ show, onSelectShow, onRemoveShow, onToggleArchive, onRewatchShow, isArchived }) {
  const posterUrl = show.poster ? `${IMAGE_BASE_URL}${show.poster}` : '';

  return (
    <div
      onClick={() => onSelectShow(show.id)}
      className="relative flex items-center justify-between rounded-2xl border border-slate-800 bg-[#1E293B] p-3 shadow-md cursor-pointer hover:border-slate-700 transition-all overflow-hidden"
    >
      <div className="flex items-center space-x-3.5 min-w-0 flex-1 pr-14">
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
          <h3 className="text-sm font-extrabold text-white truncate leading-snug">
            {show.name}
          </h3>

          <div className="flex items-center space-x-2">
            <span className="rounded bg-[#8CFA96]/15 border border-[#8CFA96]/30 px-2 py-0.5 text-[10px] font-extrabold text-[#8CFA96]">
              {show.network}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {show.status}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5">
        {isArchived && onRewatchShow && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRewatchShow(show.id);
            }}
            title="Start rewatching from S01E01"
            className="rounded-md border border-[#8CFA96]/40 bg-[#8CFA96]/10 px-2 py-1 text-[10px] font-bold text-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-900 transition-all"
          >
            🔄 Rewatch
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleArchive(show.id);
          }}
          title={isArchived ? "Restore to Active Watchlist" : "Move to Archive Vault"}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-[10px] text-slate-300 hover:border-[#8CFA96] hover:text-[#8CFA96] transition-all"
        >
          {isArchived ? '📤' : '📦'}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveShow(show.id);
          }}
          title="Remove show"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-[10px] text-slate-400 hover:text-red-400 transition-all"
        >
          ✕
        </button>
      </div>
    </div>
  );
}