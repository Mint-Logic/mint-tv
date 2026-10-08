import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchModal } from './components/SearchModal';
import { WatchlistGrid } from './components/WatchlistGrid';
import { UpcomingQueue } from './components/UpcomingQueue';
import { MasterWatchlist } from './components/MasterWatchlist';
import { ShowDetails } from './components/ShowDetails';
import { StatsDashboard } from './components/StatsDashboard';
import { RecommendationsTab } from './components/RecommendationsTab';

export default function App() {
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [activeTab, setActiveTab] = useState('ready');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [watchlist, setWatchlist] = useState(() => {
    return JSON.parse(localStorage.getItem('mint_tv_shows') || '[]');
  });

  useEffect(() => {
    localStorage.setItem('mint_tv_shows', JSON.stringify(watchlist));
  }, [watchlist]);

  function handleAddShow(show) {
    if (!watchlist.some((s) => s.id === show.id)) {
      setWatchlist([...watchlist, show]);
    }
  }

  function handleRemoveShow(id) {
    setWatchlist(watchlist.filter((s) => s.id !== id));
  }

  function handleAdvanceEpisode(id) {
    setWatchlist(
      watchlist.map((show) => {
        if (show.id === id) {
          return { ...show, currentEpisode: (show.currentEpisode || 1) + 1 };
        }
        return show;
      })
    );
  }

  function handleToggleArchive(id) {
    setWatchlist(
      watchlist.map((show) => {
        if (show.id === id) {
          return { ...show, archived: !show.archived };
        }
        return show;
      })
    );
  }

  function handleRewatchShow(id) {
    setWatchlist(
      watchlist.map((show) => {
        if (show.id === id) {
          return { ...show, currentSeason: 1, currentEpisode: 1, archived: false };
        }
        return show;
      })
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] pb-24 text-white font-sans select-none">
      <Header 
        onOpenSearch={() => setIsSearchOpen(true)} 
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Profile / Stats Overlay Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#1E293B] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">User Stats</h2>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1"
              >
                ✕ Close
              </button>
            </div>
            <StatsDashboard watchlist={watchlist} />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-md p-4">
        {selectedShowId ? (
          <ShowDetails
            showId={selectedShowId}
            showData={watchlist.find((s) => s.id === selectedShowId)}
            onBack={() => setSelectedShowId(null)}
            onUpdateEpisode={(id, season, episode) => {
              setWatchlist(
                watchlist.map((s) => {
                  if (s.id === id) {
                    const newEp = Math.max(1, episode);
                    return { ...s, currentSeason: season, currentEpisode: newEp };
                  }
                  return s;
                })
              );
            }}
          />
        ) : (
          <>
            {activeTab === 'ready' && (
              <WatchlistGrid
                watchlist={watchlist}
                onAdvanceEpisode={handleAdvanceEpisode}
                onRemoveShow={handleRemoveShow}
                onSelectShow={(id) => setSelectedShowId(id)}
              />
            )}

            {activeTab === 'upcoming' && (
              <UpcomingQueue
                watchlist={watchlist}
                onRemoveShow={handleRemoveShow}
                onSelectShow={(id) => setSelectedShowId(id)}
              />
            )}

            {activeTab === 'watchlist' && (
              <MasterWatchlist
                watchlist={watchlist}
                onSelectShow={(id) => setSelectedShowId(id)}
                onRemoveShow={handleRemoveShow}
                onToggleArchive={handleToggleArchive}
                onRewatchShow={handleRewatchShow}
              />
            )}

            {activeTab === 'recommended' && (
              <RecommendationsTab
                watchlist={watchlist}
                onAddShow={handleAddShow}
              />
            )}
          </>
        )}
      </main>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onAddShow={handleAddShow} />

      {/* 4-Tab Bottom Navigation with Safe Area Extension */}
<nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-md justify-around border-t border-slate-800 bg-[#1E293B] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md">
        <button
          onClick={() => {
            setSelectedShowId(null);
            setActiveTab('ready');
          }}
          className={`flex flex-col items-center ${activeTab === 'ready' && !selectedShowId ? 'text-[#8CFA96]' : 'text-slate-500'}`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="mt-1 text-[10px] font-bold">Ready</span>
        </button>

        <button
          onClick={() => {
            setSelectedShowId(null);
            setActiveTab('upcoming');
          }}
          className={`flex flex-col items-center ${activeTab === 'upcoming' && !selectedShowId ? 'text-[#8CFA96]' : 'text-slate-500'}`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
          </svg>
          <span className="mt-1 text-[10px] font-bold">Upcoming</span>
        </button>

        <button
          onClick={() => {
            setSelectedShowId(null);
            setActiveTab('watchlist');
          }}
          className={`flex flex-col items-center ${activeTab === 'watchlist' && !selectedShowId ? 'text-[#8CFA96]' : 'text-slate-500'}`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
          </svg>
          <span className="mt-1 text-[10px] font-bold">Watchlist</span>
        </button>

        <button
          onClick={() => {
            setSelectedShowId(null);
            setActiveTab('recommended');
          }}
          className={`flex flex-col items-center ${activeTab === 'recommended' && !selectedShowId ? 'text-[#8CFA96]' : 'text-slate-500'}`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8L12 2z" />
          </svg>
          <span className="mt-1 text-[10px] font-bold">For You</span>
        </button>
      </nav>
    </div>
  );
}