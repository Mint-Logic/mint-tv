import React, { useState, useEffect, useRef } from 'react';
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
import { getShowMetadata, getMovieWatchProviders, getMovieDetails } from './services/tmdb';
import { MovieGrid } from './components/movies/MovieGrid';
import { MovieSearchModal } from './components/movies/MovieSearchModal';
import { MovieDetails } from './components/movies/MovieDetails';
import { MovieRecommendations } from './components/movies/MovieRecommendations';

const TAB_ORDER = ['ready', 'upcoming', 'watchlist', 'recommended'];

export default function App() {
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [activeTab, setActiveTab] = useState('ready');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState(null);

  // APP MODE: 'tv' or 'movies'
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem('mint_active_mode') || 'tv';
  });

  useEffect(() => {
    localStorage.setItem('mint_active_mode', activeMode);
  }, [activeMode]);

  // ONBOARDING STATE
  const [hasSeenProfileOnboarding, setHasSeenProfileOnboarding] = useState(() => {
    return localStorage.getItem('mint_tv_profile_onboarded') === 'true';
  });

  function handleOpenProfile() {
    if (!hasSeenProfileOnboarding) {
      localStorage.setItem('mint_tv_profile_onboarded', 'true');
      setHasSeenProfileOnboarding(true);
    }
    setIsProfileOpen(true);
  }

  // Swipe gesture tracking references
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // TV Active Watchlist
  const [watchlist, setWatchlist] = useState(() => {
    return JSON.parse(localStorage.getItem('mint_tv_shows') || '[]');
  });

  // TV The Attic / RetroVision
  const [atticShows, setAtticShows] = useState(() => {
    const saved = localStorage.getItem('mint_tv_watch_later');
    return saved ? JSON.parse(saved) : [];
  });

  // MOVIE Watchlist
  const [movieWatchlist, setMovieWatchlist] = useState(() => {
    return JSON.parse(localStorage.getItem('mint_movie_watchlist') || '[]');
  });

  useEffect(() => {
    localStorage.setItem('mint_tv_shows', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('mint_tv_watch_later', JSON.stringify(atticShows));
  }, [atticShows]);

  useEffect(() => {
    localStorage.setItem('mint_movie_watchlist', JSON.stringify(movieWatchlist));
  }, [movieWatchlist]);

  // Push TV data to Supabase
  async function pushToCloud(userId, currentWatchlist, currentAttic) {
    const profileData = {
      name: localStorage.getItem('mint_tv_user_name') || 'TV Collector',
      title: localStorage.getItem('mint_tv_user_title') || 'TV & Movie Collector',
      photo: localStorage.getItem('mint_tv_user_photo') || '',
      photoPos: JSON.parse(localStorage.getItem('mint_tv_photo_pos') || '{"x":0,"y":0,"scale":1}'),
    };

    await supabase.from('watchlists').upsert(
      {
        user_id: userId,
        shows: currentWatchlist,
        attic_shows: currentAttic,
        profile: profileData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }

  // Load TV & Movie data from Supabase
  async function loadCloudData(userId) {
    // 1. Fetch TV
    const { data: tvData } = await supabase
      .from('watchlists')
      .select('shows, attic_shows, profile')
      .eq('user_id', userId)
      .maybeSingle();

    if (tvData) {
      if (tvData.shows) setWatchlist(tvData.shows);
      if (tvData.attic_shows) setAtticShows(tvData.attic_shows);

      if (tvData.profile) {
        if (tvData.profile.name) localStorage.setItem('mint_tv_user_name', tvData.profile.name);
        if (tvData.profile.title) localStorage.setItem('mint_tv_user_title', tvData.profile.title);
        if (tvData.profile.photo) localStorage.setItem('mint_tv_user_photo', tvData.profile.photo);
        if (tvData.profile.photoPos)
          localStorage.setItem('mint_tv_photo_pos', JSON.stringify(tvData.profile.photoPos));
        window.dispatchEvent(new Event('mint_tv_profile_update'));
      }
    } else {
      await pushToCloud(userId, watchlist, atticShows);
    }

    // 2. Fetch Movies
    const { data: movieRows } = await supabase
      .from('mint_movies')
      .select('*')
      .eq('user_id', userId);

    if (movieRows && movieRows.length > 0) {
      const formattedMovies = movieRows.map((m) => ({
        id: m.id,
        title: m.title,
        poster: m.poster,
        backdrop: m.backdrop,
        releaseDate: m.release_date,
        releaseYear: m.release_year,
        runtime: m.runtime,
        runtimeFormatted: m.runtime_formatted,
        mpaaRating: m.mpaa_rating,
        tmdbRating: m.tmdb_rating,
        leadActors: m.lead_actors || [],
        imdbId: m.imdb_id,
        isWatched: m.is_watched,
        watchedAt: m.watched_at,
      }));
      setMovieWatchlist(formattedMovies);
    }

    setHasLoadedFromCloud(true);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadCloudData(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  useEffect(() => {
    if (!currentUser || !hasLoadedFromCloud) return;
    pushToCloud(currentUser.id, watchlist, atticShows);
  }, [watchlist, atticShows, currentUser, hasLoadedFromCloud]);

  useEffect(() => {
    if (selectedShowId || isSearchOpen || isProfileOpen || isAuthOpen) {
      window.history.pushState({ appState: 'subview' }, '');
    }

    const handlePopState = () => {
  if (selectedShowId) {
    setSelectedShowId(null);
  } else if (selectedMovieId) {
    setSelectedMovieId(null);
  } else if (isSearchOpen) {
    setIsSearchOpen(false);
  } else if (isProfileOpen) {
    setIsProfileOpen(false);
  } else if (isAuthOpen) {
    setIsAuthOpen(false);
  }
};

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedShowId, isSearchOpen, isProfileOpen, isAuthOpen]);

  // Touch Gesture Handlers
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (selectedShowId || isSearchOpen || isProfileOpen || isAuthOpen) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      if (deltaX < 0) {
        if (currentIndex < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[currentIndex + 1]);
      } else {
        if (currentIndex > 0) setActiveTab(TAB_ORDER[currentIndex - 1]);
      }
    }
  }

  /* TV Handlers */
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

  async function handleUpdateEpisode(id, season, episode) {
    const meta = await getShowMetadata(id);
    const isEnded = meta?.status === 'Ended' || meta?.status === 'Canceled' || meta?.isEnded;
    const isFinalSeason = meta?.numberOfSeasons ? season >= meta.numberOfSeasons : true;
    const newEp = Math.max(1, episode);
    const shouldArchiveNow = Boolean(isEnded && isFinalSeason && newEp > (meta?.numberOfEpisodes || 0));

    if (shouldArchiveNow) {
      const targetShow = watchlist.find((s) => s.id === id) || atticShows.find((s) => s.id === id);
      if (targetShow) {
        const archivedShow = { ...targetShow, currentSeason: season, currentEpisode: newEp, archived: true };
        setAtticShows((prevAttic) => {
          const filtered = prevAttic.filter((s) => s.id !== id);
          return [archivedShow, ...filtered];
        });
        setWatchlist((prevWatchlist) => prevWatchlist.filter((s) => s.id !== id));
      }
    } else {
      setWatchlist((prevWatchlist) =>
        prevWatchlist.map((show) => {
          if (show.id === id) {
            return { ...show, currentSeason: season, currentEpisode: newEp };
          }
          return show;
        })
      );
    }
  }

  function handleMoveToAttic(show) {
    if (!atticShows.some((s) => s.id === show.id)) {
      setAtticShows([{ ...show, archived: true }, ...atticShows]);
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
      archived: false,
    });
    setAtticShows(atticShows.filter((s) => s.id !== show.id));
  }

  /* Movie Handlers */
  async function handleAddMovie(movie) {
    if (movieWatchlist.some((m) => m.id === movie.id)) return;

    const updated = [movie, ...movieWatchlist];
    setMovieWatchlist(updated);

    if (currentUser) {
      await supabase.from('mint_movies').upsert({
        id: movie.id,
        user_id: currentUser.id,
        title: movie.title,
        poster: movie.poster,
        backdrop: movie.backdrop,
        release_date: movie.releaseDate,
        release_year: movie.releaseYear,
        runtime: movie.runtime,
        runtime_formatted: movie.runtimeFormatted,
        mpaa_rating: movie.mpaaRating,
        tmdb_rating: movie.tmdbRating,
        lead_actors: movie.leadActors,
        imdb_id: movie.imdbId,
        is_watched: false,
      });
    }
  }

  async function handleRemoveMovie(id) {
    setMovieWatchlist(movieWatchlist.filter((m) => m.id !== id));
    if (currentUser) {
      await supabase.from('mint_movies').delete().match({ id, user_id: currentUser.id });
    }
  }

  async function handleToggleMovieWatched(id) {
    const target = movieWatchlist.find((m) => m.id === id);
    if (!target) return;

    const newWatched = !target.isWatched;
    const watchedAt = newWatched ? new Date().toISOString() : null;

    setMovieWatchlist(
      movieWatchlist.map((m) => (m.id === id ? { ...m, isWatched: newWatched, watchedAt } : m))
    );

    if (currentUser) {
      await supabase
        .from('mint_movies')
        .update({ is_watched: newWatched, watched_at: watchedAt })
        .match({ id, user_id: currentUser.id });
    }
  }

  /* ================= BACKGROUND PROVIDER REVALIDATION ================= */
  useEffect(() => {
    if (activeMode !== 'movies' || movieWatchlist.length === 0) return;

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const userRegion = localStorage.getItem('mint_user_region') || 'US';

    // Find movies that need a provider refresh
    const staleMovies = movieWatchlist.filter(
      (m) => !m.lastFetched || now - m.lastFetched > SEVEN_DAYS_MS
    );

    if (staleMovies.length === 0) return;

    let isCancelled = false;

    async function revalidateStaleMovies() {
      const updatedMovies = [...movieWatchlist];
      let hasChanges = false;

      for (const stale of staleMovies) {
        if (isCancelled) break;

        const freshProviders = await getMovieWatchProviders(stale.id, userRegion);
        if (freshProviders) {
          const index = updatedMovies.findIndex((m) => m.id === stale.id);
          if (index !== -1) {
            updatedMovies[index] = {
              ...updatedMovies[index],
              providers: {
                ...updatedMovies[index].providers,
                ...freshProviders,
              },
              lastFetched: Date.now(),
            };
            hasChanges = true;
          }
        }

        // 150ms debounce between TMDB calls
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      if (hasChanges && !isCancelled) {
        setMovieWatchlist(updatedMovies);
      }
    }

    revalidateStaleMovies();

    return () => {
      isCancelled = true;
    };
  }, [activeMode]);

  // Count calculations for bottom navigation badges
  const tvReadyCount = watchlist.length;
  const movieReadyCount = movieWatchlist.filter((m) => !m.isWatched).length;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-[#0F172A] pb-24 text-white font-sans select-none"
    >
      <Header
        activeMode={activeMode}
        onToggleMode={(mode) => {
          setSelectedShowId(null);
          setActiveMode(mode);
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={handleOpenProfile}
        hasSeenProfileOnboarding={hasSeenProfileOnboarding}
      />

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#1E293B] p-5 shadow-2xl space-y-1 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Dashboard & Settings
              </h2>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>
            <StatsDashboard
              watchlist={watchlist}
              atticShows={atticShows}
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />

      <main className="mx-auto max-w-md md:max-w-xl px-4 pt-0 pb-24">
        {activeMode === 'tv' ? (
          /* ================= TV MODE ================= */
          selectedShowId ? (
            <ShowDetails
              showId={selectedShowId}
              showData={
                watchlist.find((s) => s.id === selectedShowId) ||
                atticShows.find((s) => s.id === selectedShowId)
              }
              onBack={() => setSelectedShowId(null)}
              onUpdateEpisode={handleUpdateEpisode}
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
                      setAtticShows([{ ...show, archived: true }, ...atticShows]);
                    }
                  }}
                />
              )}
            </>
          )
        ) : (
          /* ================= MOVIE MODE ================= */
          selectedMovieId ? (
            <MovieDetails
              movie={movieWatchlist.find((m) => m.id === selectedMovieId)}
              onBack={() => setSelectedMovieId(null)}
              onToggleWatched={handleToggleMovieWatched}
              onRemoveMovie={handleRemoveMovie}
            />
          ) : activeTab === 'recommended' ? (
            <MovieRecommendations
              movieWatchlist={movieWatchlist}
              onAddMovie={handleAddMovie}
              onSelectMovie={async (id) => {
                const fullDetails = await getMovieDetails(id);
                if (fullDetails) {
                  handleAddMovie(fullDetails);
                  setSelectedMovieId(id);
                }
              }}
            />
          ) : (
            <MovieGrid
              activeTab={activeTab}
              movies={movieWatchlist}
              onToggleWatched={handleToggleMovieWatched}
              onRemoveMovie={handleRemoveMovie}
              onSelectMovie={(id) => setSelectedMovieId(id)}
            />
          )
        )}
      </main>

      {activeMode === 'tv' ? (
        <SearchModal 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          onAddShow={handleAddShow}
          watchlist={watchlist} 
        />
      ) : (
        <MovieSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onAddMovie={handleAddMovie}
          movieWatchlist={movieWatchlist}
        />
      )}

      {/* BOTTOM NAVIGATION WITH ADAPTIVE MOVIE/TV LABELS */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-slate-800 bg-[#1E293B]/95 backdrop-blur-md pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md md:max-w-xl items-center justify-around px-4 pt-2">
          {/* TAB 1 */}
          <button
            onClick={() => {
              setSelectedShowId(null);
              setSelectedMovieId(null);
              setActiveTab('ready');
            }}
            aria-label={activeMode === 'tv' ? 'Ready tab' : 'Watchlist tab'}
            className={`flex flex-col items-center relative ${
              activeTab === 'ready' && !selectedShowId && !selectedMovieId
                ? 'text-[#8CFA96]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <div className="relative">
              {activeMode === 'tv' ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
                </svg>
              )}
              {(activeMode === 'tv' ? tvReadyCount : movieReadyCount) > 0 && (
                <span className="absolute -top-1.5 -right-3.5 bg-[#8CFA96] text-slate-950 font-black text-[9px] px-1 rounded-full min-w-[14px] text-center leading-tight">
                  {activeMode === 'tv' ? tvReadyCount : movieReadyCount}
                </span>
              )}
            </div>
            <span className="mt-1 text-[10px] font-bold">
              {activeMode === 'tv' ? 'Ready' : 'Watchlist'}
            </span>
          </button>

          {/* TAB 2 */}
          <button
            onClick={() => {
              setSelectedShowId(null);
              setSelectedMovieId(null);
              setActiveTab('upcoming');
            }}
            aria-label="Upcoming schedule tab"
            className={`flex flex-col items-center ${
              activeTab === 'upcoming' && !selectedShowId && !selectedMovieId
                ? 'text-[#8CFA96]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
            </svg>
            <span className="mt-1 text-[10px] font-bold">Upcoming</span>
          </button>

          {/* TAB 3 */}
          <button
            onClick={() => {
              setSelectedShowId(null);
              setSelectedMovieId(null);
              setActiveTab('watchlist');
            }}
            aria-label={activeMode === 'tv' ? 'Watchlist tab' : 'RetroVision tab'}
            className={`flex flex-col items-center ${
              activeTab === 'watchlist' && !selectedShowId && !selectedMovieId
                ? 'text-[#8CFA96]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {activeMode === 'tv' ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="mt-1 text-[10px] font-bold">
              {activeMode === 'tv' ? 'Watchlist' : 'RetroVision'}
            </span>
          </button>

          {/* TAB 4 */}
          <button
            onClick={() => {
              setSelectedShowId(null);
              setSelectedMovieId(null);
              setActiveTab('recommended');
            }}
            aria-label="Recommendations tab"
            className={`flex flex-col items-center ${
              activeTab === 'recommended' && !selectedShowId && !selectedMovieId
                ? 'text-[#8CFA96]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8L12 2z" />
            </svg>
            <span className="mt-1 text-[10px] font-bold">For You</span>
          </button>
        </div>
      </nav>
    </div>
  );
}