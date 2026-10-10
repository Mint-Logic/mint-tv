import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchModal } from './components/SearchModal';
import { WatchlistGrid } from './components/WatchlistGrid';
import { UpcomingQueue } from './components/UpcomingQueue';
import { MasterWatchlist } from './components/MasterWatchlist';
import { ShowDetails } from './components/ShowDetails';
import { StatsDashboard } from './components/StatsDashboard';
import { RecommendationsTab } from './components/RecommendationsTab';
import { supabase } from './supabase';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [activeTab, setActiveTab] = useState('ready');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Prevents empty local state from overwriting cloud data on startup
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false);

  // Active Watchlist
  const [watchlist, setWatchlist] = useState(() => {
    return JSON.parse(localStorage.getItem('mint_tv_shows') || '[]');
  });

  // The Attic (Preserves legacy items)
  const [atticShows, setAtticShows] = useState(() => {
    const saved = localStorage.getItem('mint_tv_watch_later');
    return saved ? JSON.parse(saved) : [];
  });

  // Local storage backups
  useEffect(() => {
    localStorage.setItem('mint_tv_shows', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('mint_tv_watch_later', JSON.stringify(atticShows));
  }, [atticShows]);

  // Helper to push current state up to Supabase
  async function pushToCloud(userId, currentWatchlist, currentAttic) {
    await supabase
      .from('watchlists')
      .upsert(
        {
          user_id: userId,
          shows: currentWatchlist,
          attic_shows: currentAttic,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
  }

  // Fetch watchlist & attic from Supabase
  async function loadCloudData(userId) {
    const { data, error } = await supabase
      .from('watchlists')
      .select('shows, attic_shows')
      .eq('user_id', userId)
      .maybeSingle();

    if (data && (data.shows || data.attic_shows)) {
      if (data.shows) setWatchlist(data.shows);
      if (data.attic_shows) setAtticShows(data.attic_shows);
    } else {
      // If table row doesn't exist yet, push initial local data to populate Supabase
      await pushToCloud(userId, watchlist, atticShows);
    }

    setHasLoadedFromCloud(true);
  }

  // Listen for Supabase Authentication state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadCloudData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadCloudData(session.user.id);
      } else {
        setCurrentUser(null);
        setHasLoadedFromCloud(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync state changes to Supabase in background
  useEffect(() => {
    if (!currentUser || !hasLoadedFromCloud) return;

    syncToCloud();

    async function syncToCloud() {
      await pushToCloud(currentUser.id, watchlist, atticShows);
    }
  }, [watchlist, atticShows, currentUser, hasLoadedFromCloud]);

  // Android System Back Navigation Integration
  useEffect(() => {
    if (selectedShowId || isSearchOpen || isProfileOpen || isAuthOpen) {
      window.history.pushState({ appState: 'subview' }, '');
    }

    const handlePopState = () => {
      if (selectedShowId) {
        setSelectedShowId(null);
      } else if (isSearchOpen) {
        setIsSearchOpen(false);
      } else if (isProfileOpen) {
        setIsProfileOpen(false);
      } else if (isAuthOpen) {
        setIsAuthOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedShowId, isSearchOpen, isProfileOpen, isAuthOpen]);

  function handleAddShow(show) {
    if (!watchlist.some((s) => s.id === show.id)) {
      setWatchlist([...watchlist, show]);
    }
  }

  function handleRemoveShow(id) {
    setWatchlist(watchlist.filter((s) => s.id !== id));
  }

  function handleRemoveFromAttic(id) {
    setAtticShows(atticShows.filter((s) => s.id !== id));
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

  function handleMoveToAttic(show) {
    if (!atticShows.some((s) => s.id === show.id)) {
      setAtticShows([show, ...atticShows]);
    }
    setWatchlist(watchlist.filter((s) => s.id !== show.id));
  }

  function handleRestoreFromAttic(show) {
    handleAddShow({
      id: show.id,
      name: show.name,
      poster: show.poster_path || show.poster,
      backdrop: show.backdrop_path || show.backdrop,
      currentSeason: 1,
      currentEpisode: 1,
      completed: false,
    });
    setAtticShows(atticShows.filter((s) => s.id !== show.id));
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
            <StatsDashboard 
              watchlist={watchlist} 
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Cloud Auth Modal */}
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />

      <main className="mx-auto max-w-md p-4">
        {selectedShowId ? (
          <ShowDetails
            showId={selectedShowId}
            showData={watchlist.find((s) => s.id === selectedShowId) || atticShows.find((s) => s.id === selectedShowId)}
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
                atticShows={atticShows}
                onSelectShow={(id) => setSelectedShowId(id)}
                onRemoveShow={handleRemoveShow}
                onRemoveFromAttic={handleRemoveFromAttic}
                onMoveToAttic={handleMoveToAttic}
                onRestoreFromAttic={handleRestoreFromAttic}
              />
            )}

            {activeTab === 'recommended' && (
              <RecommendationsTab
                watchlist={watchlist}
                atticShows={atticShows}
                onAddShow={handleAddShow}
                onMoveToAttic={(show) => {
                  if (!atticShows.some((s) => s.id === show.id)) {
                    setAtticShows([show, ...atticShows]);
                  }
                }}
              />
            )}
          </>
        )}
      </main>

      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onAddShow={handleAddShow}
        watchlist={watchlist} 
      />

      {/* 4-Tab Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-md justify-around border-t border-slate-800 bg-[#1E293B] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md">
        <button
          onClick={() => { setSelectedShowId(null); setActiveTab('ready'); }}
          className={`flex flex-col items-center ${activeTab === 'ready' && !selectedShowId ? 'text-[#8CFA96]' : 'text-slate-500'}`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          <span className="mt-1 text-[10px] font-bold">Ready</span>
        </button>

        <button
          onClick={() => { setSelectedShowId(null); setActiveTab('upcoming'); }}
          className={`flex flex-col items-center ${activeTab === 'upcoming' && !selectedShowId ? 'text-[#8CFA96]' : 'text-slate-500'}`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" /></svg>
          <span className="mt-1 text-[10px] font-bold">Upcoming</span>
        </button>

        <button
          onClick={() => { setSelectedShowId(null); setActiveTab('watchlist'); }}
          className={`flex flex-col items-center ${activeTab === 'watchlist' && !selectedShowId ? 'text-[#8CFA96]' : 'text-slate-500'}`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" /></svg>
          <span className="mt-1 text-[10px] font-bold">Watchlist</span>
        </button>

        <button
          onClick={() => { setSelectedShowId(null); setActiveTab('recommended'); }}
          className={`flex flex-col items-center ${activeTab === 'recommended' && !selectedShowId ? 'text-[#8CFA96]' : 'text-slate-500'}`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8L12 2z" /></svg>
          <span className="mt-1 text-[10px] font-bold">For You</span>
        </button>
      </nav>
    </div>
  );
}