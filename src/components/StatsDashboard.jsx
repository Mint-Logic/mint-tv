import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import retroVisionLogo from '../assets/retro-vision-logo.png';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeUserToPush(currentUser) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push notifications are not supported on this browser.');
    return false;
  }

  if (!currentUser || !currentUser.id) {
    alert('Please log in or sign up below to enable push notifications.');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Notification permission was denied in your browser settings.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      console.error('VITE_VAPID_PUBLIC_KEY is missing in .env');
      alert('Missing VAPID Public Key in environment configuration.');
      return false;
    }

    const convertedKey = urlBase64ToUint8Array(publicKey);

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: currentUser.id,
        subscription: subscription.toJSON(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Error saving subscription to Supabase:', error);
      alert(`Database error: ${error.message}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    alert(`Push subscription error: ${err.message || err}`);
    return false;
  }
}

async function unsubscribeUserFromPush(currentUser) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    if (currentUser) {
      await supabase.from('push_subscriptions').delete().eq('user_id', currentUser.id);
    }
    return true;
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
    return false;
  }
}

const PRESET_TITLES = [
  'TV & Movie Collector',
  'Binge Architect',
  'Couch Potato Supreme',
  'Subtitle Specialist',
  'Cinema Connoisseur',
  'Custom...',
];

const POPULAR_STREAMERS = [
  { id: 8, name: 'Netflix' },
  { id: 1899, name: 'Max' },
  { id: 337, name: 'Disney+' },
  { id: 15, name: 'Hulu' },
  { id: 350, name: 'Apple TV+' },
  { id: 9, name: 'Amazon Prime' },
  { id: 531, name: 'Paramount+' },
  { id: 386, name: 'Peacock' },
  { id: 283, name: 'Crunchyroll' },
];

const STREAMING_REGIONS = [
  { code: 'US', label: 'United States (US)' },
  { code: 'CA', label: 'Canada (CA)' },
  { code: 'GB', label: 'United Kingdom (UK)' },
  { code: 'AU', label: 'Australia (AU)' },
];

const TMDB_TV_GENRES = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' },
];

export function StatsDashboard({ watchlist, atticShows = [], currentUser, onOpenAuth }) {
  const [profileName, setProfileName] = useState(() => {
    return localStorage.getItem('mint_tv_user_name') || 'TV Collector';
  });
  const [profileTitle, setProfileTitle] = useState(() => {
    return localStorage.getItem('mint_tv_user_title') || 'TV & Movie Collector';
  });
  const [selectedDropdownOption, setSelectedDropdownOption] = useState(() => {
    const savedTitle = localStorage.getItem('mint_tv_user_title') || 'TV & Movie Collector';
    return PRESET_TITLES.includes(savedTitle) ? savedTitle : 'Custom...';
  });

  const [customPhoto, setCustomPhoto] = useState(() => {
    return localStorage.getItem('mint_tv_user_photo') || '';
  });
  
  const [photoPos, setPhotoPos] = useState(() => {
    const saved = localStorage.getItem('mint_tv_photo_pos');
    return saved ? JSON.parse(saved) : { x: 0, y: 0, scale: 1 };
  });

  // STREAMER SETTINGS STATE
  const [userProviders, setUserProviders] = useState(() => {
    const saved = localStorage.getItem('mint_user_providers');
    return saved ? JSON.parse(saved) : [8, 1899, 337, 15, 350, 9];
  });

  const [userRegion, setUserRegion] = useState(() => {
    return localStorage.getItem('mint_user_region') || 'US';
  });

  const [likedGenres, setLikedGenres] = useState(() => {
    const saved = localStorage.getItem('mint_tv_liked_genres');
    return saved ? JSON.parse(saved) : [10765, 18, 35, 99];
  });

  const [mutedGenres, setMutedGenres] = useState(() => {
    const saved = localStorage.getItem('mint_tv_muted_genres');
    return saved ? JSON.parse(saved) : [10764, 10767, 10766];
  });

  const [excludeAnime, setExcludeAnime] = useState(() => {
    return localStorage.getItem('mint_tv_exclude_anime') === 'true';
  });

  const [excludeTrueCrime, setExcludeTrueCrime] = useState(() => {
    return localStorage.getItem('mint_tv_exclude_true_crime') === 'true';
  });

  const [boostNature, setBoostNature] = useState(() => {
    return localStorage.getItem('mint_tv_boost_nature') === 'true';
  });

  const [excludeReality, setExcludeReality] = useState(() => {
    return localStorage.getItem('mint_tv_exclude_reality') === 'true';
  });

  const [excludeForeign, setExcludeForeign] = useState(() => {
    return localStorage.getItem('mint_tv_exclude_foreign') === 'true';
  });

  const [isStreamersDrawerOpen, setIsStreamersDrawerOpen] = useState(false);
  const [isGenreDrawerOpen, setIsGenreDrawerOpen] = useState(false);
  const [isHelpFaqDrawerOpen, setIsHelpFaqDrawerOpen] = useState(false);

  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    return localStorage.getItem('mint_tv_profile_onboarded_dismissed') === 'true';
  });

  function handleDismissBanner() {
    localStorage.setItem('mint_tv_profile_onboarded_dismissed', 'true');
    setIsBannerDismissed(true);
  }

  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    async function checkPushStatus() {
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setPushEnabled(!!sub);
      }
    }
    checkPushStatus();
  }, [currentUser]);

  async function handlePushToggle() {
    if (pushEnabled) {
      const ok = await unsubscribeUserFromPush(currentUser);
      if (ok) setPushEnabled(false);
    } else {
      const ok = await subscribeUserToPush(currentUser);
      if (ok) setPushEnabled(true);
    }
  }

  const [isEditing, setIsEditing] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const [helpSubTab, setHelpSubTab] = useState('guide');

  useEffect(() => {
    try {
      localStorage.setItem('mint_tv_user_name', profileName);
      localStorage.setItem('mint_tv_user_title', profileTitle);
      localStorage.setItem('mint_tv_user_photo', customPhoto);
      localStorage.setItem('mint_tv_photo_pos', JSON.stringify(photoPos));
      localStorage.setItem('mint_user_providers', JSON.stringify(userProviders));
      localStorage.setItem('mint_user_region', userRegion);
      localStorage.setItem('mint_tv_liked_genres', JSON.stringify(likedGenres));
      localStorage.setItem('mint_tv_muted_genres', JSON.stringify(mutedGenres));
      localStorage.setItem('mint_tv_exclude_anime', excludeAnime);
      localStorage.setItem('mint_tv_exclude_true_crime', excludeTrueCrime);
      localStorage.setItem('mint_tv_boost_nature', boostNature);
      localStorage.setItem('mint_tv_exclude_reality', excludeReality);
      localStorage.setItem('mint_tv_exclude_foreign', excludeForeign); 
      
      window.dispatchEvent(new Event('mint_tv_profile_update'));
      window.dispatchEvent(new Event('mint_providers_update'));
    } catch (e) {
      console.warn('LocalStorage limit reached while saving profile settings', e);
    }
  }, [profileName, profileTitle, customPhoto, photoPos, userProviders, userRegion, likedGenres, mutedGenres, excludeAnime, excludeTrueCrime, boostNature, excludeReality, excludeForeign]); 

  function toggleProvider(providerId) {
    setUserProviders((prev) =>
      prev.includes(providerId) ? prev.filter((id) => id !== providerId) : [...prev, providerId]
    );
  }

  function moveGenre(genreId, targetState) {
    setLikedGenres((prev) => prev.filter((id) => id !== genreId));
    setMutedGenres((prev) => prev.filter((id) => id !== genreId));

    if (targetState === 'liked') {
      setLikedGenres((prev) => [...prev, genreId]);
    } else if (targetState === 'muted') {
      setMutedGenres((prev) => [...prev, genreId]);
    }
  }

  const totalEpisodesWatched = watchlist.reduce(
    (acc, show) => acc + (show.currentEpisode || 1) - 1,
    0
  );
  const totalMinutes = totalEpisodesWatched * 45;
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);

  const getLevelDetails = (episodes) => {
    const trophySvg = (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 15a6 6 0 006-6V3H6v6a6 6 0 006 6zm0 0v3m-4 3h8M6 5H4a2 2 0 00-2 2v1a3 3 0 003 3h1m12-6h2a2 2 0 012 2v1a3 3 0 01-3 3h-1"
      /> 
    );

    if (episodes >= 5000) {
      return {
        level: 5,
        title: 'LEGEND',
        nextReq: 'MAX LEVEL',
        progress: 100,
        color: 'text-amber-300 border-amber-400/50 bg-amber-400/10',
        badgeSvg: trophySvg,
      };
    }
    if (episodes >= 2500) {
      return {
        level: 4,
        title: 'CULTIST',
        nextReq: `${episodes}/5000 eps to Lvl 4`,
        progress: Math.min(100, Math.round((episodes / 5000) * 100)),
        color: 'text-purple-300 border-purple-400/50 bg-purple-400/10',
        badgeSvg: trophySvg,
      };
    }
    if (episodes >= 1000) {
      return {
        level: 3,
        title: 'AUTEUR',
        nextReq: `${episodes}/2500 eps to Lvl 4`,
        progress: Math.min(100, Math.round((episodes / 2500) * 100)),
        color: 'text-cyan-300 border-cyan-400/50 bg-cyan-400/10',
        badgeSvg: trophySvg,
      };
    }
    if (episodes >= 250) {
      return {
        level: 2,
        title: 'MARATHONER',
        nextReq: `${episodes}/1000 eps to Lvl 3`,
        progress: Math.min(100, Math.round((episodes / 1000) * 100)),
        color: 'text-[#8CFA96] border-[#8CFA96]/50 bg-[#8CFA96]/10',
        badgeSvg: trophySvg,
      };
    }
    return {
      level: 1,
      title: 'NOVICE',
      nextReq: `${episodes}/250 eps to Lvl 2`,
      progress: Math.min(100, Math.round((episodes / 250) * 100)),
      color: 'text-slate-300 border-slate-500 bg-slate-800/60',
      badgeSvg: trophySvg,
    };
  };

  const levelInfo = getLevelDetails(totalEpisodesWatched);

  const initials = profileName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'TV';

  function handleTitleDropdownChange(e) {
    const value = e.target.value;
    setSelectedDropdownOption(value);

    if (value === 'Custom...') {
      if (PRESET_TITLES.includes(profileTitle)) {
        setProfileTitle('');
      }
    } else {
      setProfileTitle(value);
    }
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCustomPhoto(compressedDataUrl);
        setPhotoPos({ x: 0, y: 0, scale: 1 });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handlePointerDown(e) {
    if (!customPhoto || !isEditing) return;
    setIsDragging(true);
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    dragStart.current = { x: clientX - photoPos.x, y: clientY - photoPos.y };
  }

  function handlePointerMove(e) {
    if (!isDragging) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    setPhotoPos((prev) => ({
      ...prev,
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y,
    }));
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  function handleExportData() {
    const backupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        name: localStorage.getItem('mint_tv_user_name') || '',
        title: localStorage.getItem('mint_tv_user_title') || '',
        photo: localStorage.getItem('mint_tv_user_photo') || '',
        photoPos: JSON.parse(localStorage.getItem('mint_tv_photo_pos') || '{"x":0,"y":0,"scale":1}'),
        userProviders,
        userRegion,
        likedGenres,
        mutedGenres,
        excludeAnime,
        excludeTrueCrime,
        boostNature,
      },
      watchlist: watchlist,
      atticShows: atticShows,
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const fileName = `mint_tv_backup_${new Date().toISOString().split('T')[0]}.json`;
    const blob = new Blob([jsonString], { type: 'application/json' });

    if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'application/json' })] })) {
      const file = new File([blob], fileName, { type: 'application/json' });
      navigator.share({
        files: [file],
        title: 'Mint TV Backup',
      }).catch(() => {});
    } else {
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = fileName;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    }
  }

  function handleImportData(e) {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result);

          if (importedData.watchlist && Array.isArray(importedData.watchlist)) {
            localStorage.setItem('mint_tv_shows', JSON.stringify(importedData.watchlist));
            
            if (importedData.atticShows && Array.isArray(importedData.atticShows)) {
              localStorage.setItem('mint_tv_watch_later', JSON.stringify(importedData.atticShows));
            }

            if (importedData.profile) {
              if (importedData.profile.name) localStorage.setItem('mint_tv_user_name', importedData.profile.name);
              if (importedData.profile.title) localStorage.setItem('mint_tv_user_title', importedData.profile.title);
              if (importedData.profile.photo) localStorage.setItem('mint_tv_user_photo', importedData.profile.photo);
              if (importedData.profile.photoPos) localStorage.setItem('mint_tv_photo_pos', JSON.stringify(importedData.profile.photoPos));
              if (importedData.profile.userProviders) localStorage.setItem('mint_user_providers', JSON.stringify(importedData.profile.userProviders));
              if (importedData.profile.userRegion) localStorage.setItem('mint_user_region', importedData.profile.userRegion);
              if (importedData.profile.likedGenres) localStorage.setItem('mint_tv_liked_genres', JSON.stringify(importedData.profile.likedGenres));
              if (importedData.profile.mutedGenres) localStorage.setItem('mint_tv_muted_genres', JSON.stringify(importedData.profile.mutedGenres));
              if (typeof importedData.profile.excludeAnime === 'boolean') localStorage.setItem('mint_tv_exclude_anime', importedData.profile.excludeAnime);
              if (typeof importedData.profile.excludeTrueCrime === 'boolean') localStorage.setItem('mint_tv_exclude_true_crime', importedData.profile.excludeTrueCrime);
              if (typeof importedData.profile.boostNature === 'boolean') localStorage.setItem('mint_tv_boost_nature', importedData.profile.boostNature);
            }
            window.location.reload();
          } else if (Array.isArray(importedData)) {
            localStorage.setItem('mint_tv_shows', JSON.stringify(importedData));
            window.location.reload();
          } else {
            alert('Invalid backup file format.');
          }
        } catch (err) {
          alert('Error parsing JSON backup file.');
        }
      };
    }
  }

  const likedGenreObjects = TMDB_TV_GENRES.filter((g) => likedGenres.includes(g.id));
  const mutedGenreObjects = TMDB_TV_GENRES.filter((g) => mutedGenres.includes(g.id));
  const neutralGenreObjects = TMDB_TV_GENRES.filter(
    (g) => !likedGenres.includes(g.id) && !mutedGenres.includes(g.id)
  );

  return (
    <div className="space-y-3 relative">
      {/* FIRST-TIME WELCOME BANNER */}
      {!isBannerDismissed && (
        <div className="rounded-2xl border border-[#8CFA96]/40 bg-[#8CFA96]/10 p-2.5 space-y-1 shadow-lg">
          <div className="space-y-1 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#8CFA96] block">
              Welcome to Mint TV!
            </span>
            <p className="text-[10px] text-slate-300 leading-relaxed w-full">
              Tailor subscriptions in <strong className="text-white">Streaming Subscriptions</strong>, refine recommendations in <strong className="text-white">Genre Preferences</strong>, turn on <strong className="text-white">Episode Alerts</strong> for push notifications, or check out the <strong className="text-white">Help & User Guide</strong> below to learn more!
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleDismissBanner}
              className="rounded-lg border border-[#8CFA96]/40 bg-[#8CFA96]/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-950 transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* PROFILE HEADER HERO */}
      <div className="flex flex-col items-center text-center pt-0 pb-0">
        <div
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className={`relative mb-1 flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#8CFA96] bg-slate-900 shadow-xl shadow-[#8CFA96]/15 ${
            isEditing && customPhoto ? 'cursor-grab active:cursor-grabbing ring-2 ring-[#8CFA96]/50' : ''
          }`}
        >
          {customPhoto ? (
            <img
              src={customPhoto}
              alt="Profile Avatar"
              style={{
                transform: `translate(${photoPos.x}px, ${photoPos.y}px) scale(${photoPos.scale})`,
              }}
              className="absolute max-w-none max-h-none h-full w-auto pointer-events-none select-none transition-transform duration-75"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-900 border-[#8CFA96] text-[38px] font-black tracking-wider leading-none text-[#8CFA96] select-none">
              <span className="translate-x-[1px]">{initials}</span>
            </div>
          )}
        </div>

        {!isEditing ? (
          <div className="flex flex-col items-center space-y-1">
            <h2 className="text-lg font-bold text-white tracking-tight">{profileName}</h2>
            <p className="text-xs font-semibold text-slate-300">{profileTitle}</p>

            <button
              onClick={() => setIsEditing(true)}
              className="mt-1.5 inline-flex items-center space-x-1 rounded-full border border-slate-700 bg-slate-900/50 px-2.5 py-0.5 text-[10px] font-medium text-slate-300 hover:border-slate-500 hover:bg-slate-800 hover:text-white transition-all"
            >
              <svg className="h-2.5 w-2.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit Profile</span>
            </button>
          </div>
        ) : (
          <div className="w-full mt-3 space-y-3.5 rounded-2xl border border-slate-800 bg-[#1E293B] p-4 text-left shadow-lg">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                Edit Profile
              </span>
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs font-bold text-[#8CFA96] hover:underline"
              >
                Save Edits
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-300">Display Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-500 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-[#8CFA96] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-300 block mb-1">
                Profile Title
              </label>
              <select
                value={selectedDropdownOption}
                onChange={handleTitleDropdownChange}
                className="w-full rounded-xl border border-slate-500 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-[#8CFA96] focus:outline-none cursor-pointer"
              >
                {PRESET_TITLES.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>

              {selectedDropdownOption === 'Custom...' && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-slate-300">Custom Title Text</label>
                    <span className="text-[9px] font-bold text-slate-300">
                      {profileTitle.length}/28
                    </span>
                  </div>
                  <input
                    type="text"
                    autoFocus
                    maxLength={28}
                    value={profileTitle === 'Custom...' ? '' : profileTitle}
                    onChange={(e) => setProfileTitle(e.target.value)}
                    placeholder="Enter your custom title..."
                    className="w-full rounded-xl border border-slate-500 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-[#8CFA96] focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-300 block mb-1">
                Upload Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8CFA96] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-900 hover:file:opacity-90 cursor-pointer"
              />
            </div>

            {customPhoto && (
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8CFA96]">
                    Drag photo to position
                  </span>
                  <button
                    onClick={() => setPhotoPos({ x: 0, y: 0, scale: 1 })}
                    className="text-[10px] text-slate-300 hover:text-white underline"
                  >
                    Reset
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1">
                    <span>Zoom</span>
                    <span>{Math.round(photoPos.scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="3"
                    step="0.05"
                    value={photoPos.scale}
                    onChange={(e) =>
                      setPhotoPos((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-[#8CFA96]"
                  />
                </div>

                <button
                  onClick={() => {
                    setCustomPhoto('');
                    localStorage.removeItem('mint_tv_user_photo');
                  }}
                  className="text-[10px] text-red-400 underline font-semibold block pt-1"
                >
                  Remove picture
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* USER STATS CONTAINER */}
      <div className="-mx-3 sm:-mx-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-lg divide-y divide-slate-800/80">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${levelInfo.color}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {levelInfo.badgeSvg}
              </svg>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black tracking-widest uppercase ${levelInfo.color}`}>
              {levelInfo.title}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-slate-300">
              Level {levelInfo.level}
            </span>
            <button
              onClick={() => setShowLevelInfo(!showLevelInfo)}
              title="View Leveling Details"
              aria-label="View Leveling Details"
              className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 bg-slate-800 text-[10px] font-black text-slate-300 hover:border-[#8CFA96] hover:text-[#8CFA96] transition-all"
            >
              i
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#8CFA96]/10 border border-[#8CFA96]/30 text-[#8CFA96]">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-slate-300 truncate">Episodes Watched</span>
          </div>
          <span className="text-sm font-bold text-[#8CFA96] shrink-0 tracking-tight">{totalEpisodesWatched}</span>
        </div>

        <div className="flex items-center justify-between px-4 py-2 gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#8CFA96]/10 border border-[#8CFA96]/30 text-[#8CFA96]">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-slate-300 truncate">Total Time Watched</span>
          </div>
          <div className="text-sm font-bold text-[#8CFA96] shrink-0 tracking-tight whitespace-nowrap">
            {days}d {hours}h
          </div>
        </div>
      </div>

      {/* MY STREAMING SUBSCRIPTIONS ACCORDION */}
      <div className="-mx-3 sm:-mx-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-lg">
        <button
          onClick={() => setIsStreamersDrawerOpen(!isStreamersDrawerOpen)}
          className="w-full flex justify-between items-center px-4 py-2.5 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
              MY STREAMING SUBSCRIPTIONS
            </span>
            <span className="text-[9px] font-bold text-[#8CFA96] bg-[#8CFA96]/15 border border-[#8CFA96]/30 px-1.5 py-0.2 rounded-full">
              {userProviders.length} active
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#8CFA96] transition-transform duration-200">
            {isStreamersDrawerOpen ? '▲' : '▼'}
          </span>
        </button>

        {isStreamersDrawerOpen && (
          <div className="p-4 space-y-4 border-t border-slate-800 animate-in fade-in">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Select the platforms you subscribe to. Movies available on these services will automatically appear under <strong className="text-white">Free with Subscription</strong> in your Ready queue.
            </p>

            {/* Streaming Region Selector */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Streaming Country / Region
              </label>
              <select
                value={userRegion}
                onChange={(e) => setUserRegion(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-[#8CFA96] focus:outline-none cursor-pointer"
              >
                {STREAMING_REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Grid */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Subscriptions
              </span>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_STREAMERS.map((provider) => {
                  const isChecked = userProviders.includes(provider.id);
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => toggleProvider(provider.id)}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition-all text-left ${
                        isChecked
                          ? 'border-[#8CFA96] bg-[#8CFA96]/15 text-[#8CFA96] shadow-sm'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{provider.name}</span>
                      <span className="text-xs shrink-0 pl-1">{isChecked ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MINIMALIST GENRE PREFERENCES ACCORDION */}
      <div className="-mx-3 sm:-mx-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-lg">
        <button
          onClick={() => setIsGenreDrawerOpen(!isGenreDrawerOpen)}
          className="w-full flex justify-between items-center px-4 py-2.5 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
            MANAGE GENRE PREFERENCES
          </span>
          <span className="text-[10px] font-bold text-[#8CFA96] transition-transform duration-200">
            {isGenreDrawerOpen ? '▲' : '▼'}
          </span>
        </button>

        {isGenreDrawerOpen && (
          <div className="p-4 space-y-4 border-t border-slate-800 animate-in fade-in">
            {/* CONTENT & SUB-GENRE GUARDRAILS */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8CFA96] block">
                  Content & Sub-Genre Guardrails
                </span>
                <span className="text-[9px] text-slate-300 block mt-0.5">
                  Fine-tune recommendations
                </span>
              </div>

              {/* 1. Anime Filter */}
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeAnime}
                  onChange={(e) => setExcludeAnime(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-[#8CFA96] focus:ring-0 accent-[#8CFA96]"
                />
                <span className="text-xs font-bold text-slate-200">
                  Filter Anime Titles <span className="text-[10px] font-normal text-slate-300"><br></br>(Keep general animated series)</span>
                </span>
              </label>

              {/* 2. Reality TV Filter */}
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeReality}
                  onChange={(e) => setExcludeReality(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-[#8CFA96] focus:ring-0 accent-[#8CFA96]"
                />
                <span className="text-xs font-bold text-slate-200">
                  Filter Reality & Talk Shows <span className="text-[10px] font-normal text-slate-300"><br></br>(Exclude unscripted & competition TV)</span>
                </span>
              </label>

              {/* 3. True Crime Filter */}
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeTrueCrime}
                  onChange={(e) => setExcludeTrueCrime(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-[#8CFA96] focus:ring-0 accent-[#8CFA96]"
                />
                <span className="text-xs font-bold text-slate-200">
                  Filter True Crime & Investigation <span className="text-[10px] font-normal text-slate-300"><br></br>(Exclude crime docuseries)</span>
                </span>
              </label>

              {/* 4. Documentary Curation Filter */}
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={boostNature}
                  onChange={(e) => setBoostNature(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-[#8CFA96] focus:ring-0 accent-[#8CFA96]"
                />
                <span className="text-xs font-bold text-slate-200">
                  Educational Documentary Topics <span className="text-[10px] font-normal text-slate-300"><br></br>(Focus docs on Nature, Space & Science)</span>
                </span>
              </label>

              {/* 5. Primary Language Filter */}
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeForeign}
                  onChange={(e) => setExcludeForeign(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-[#8CFA96] focus:ring-0 accent-[#8CFA96]"
                />
                <span className="text-xs font-bold text-slate-200">
                  English Audio Only <span className="text-[10px] font-normal text-slate-300"><br></br>(Hide titles requiring subtitles)</span>
                </span>
              </label>
            </div> 

            {/* LIKED CATEGORY */}
            <div className="rounded-xl border border-[#8CFA96]/30 bg-[#8CFA96]/5 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8CFA96]">
                  Liked ({likedGenreObjects.length})
                </span>
                <span className="text-[9px] text-slate-300">Boosted in discovery</span>
              </div>

              {likedGenreObjects.length === 0 ? (
                <p className="text-[10px] text-slate-300 italic">No liked genres selected.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {likedGenreObjects.map((g) => (
                    <span
                      key={g.id}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-[#8CFA96]/40 bg-[#8CFA96]/10 text-[#8CFA96] text-[11px] font-bold"
                    >
                      <span>{g.name}</span>
                      <button
                        onClick={() => moveGenre(g.id, 'neutral')}
                        className="text-slate-300 hover:text-white pl-1"
                        title="Move to neutral"
                        aria-label={`Remove ${g.name} from liked genres`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* MUTED CATEGORY */}
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                  Muted ({mutedGenreObjects.length})
                </span>
                <span className="text-[9px] text-slate-300">Hidden from discovery</span>
              </div>

              {mutedGenreObjects.length === 0 ? (
                <p className="text-[10px] text-slate-300 italic">No muted genres.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {mutedGenreObjects.map((g) => (
                    <span
                      key={g.id}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[11px] font-bold"
                    >
                      <span>{g.name}</span>
                      <button
                        onClick={() => moveGenre(g.id, 'neutral')}
                        className="text-slate-300 hover:text-white pl-1"
                        title="Move to neutral"
                        aria-label={`Remove ${g.name} from muted genres`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* NEUTRAL CATEGORY */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                Neutral / Available Genres ({neutralGenreObjects.length})
              </span>

              <div className="flex flex-wrap gap-1.5">
                {neutralGenreObjects.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 text-[11px] font-semibold"
                  >
                    <span>{g.name}</span>
                    <button
                      onClick={() => moveGenre(g.id, 'liked')}
                      className="text-[#8CFA96] hover:scale-125 transition-transform px-1 font-bold"
                      title="Like genre"
                      aria-label={`Like ${g.name}`}
                    >
                      +
                    </button>
                    <button
                      onClick={() => moveGenre(g.id, 'muted')}
                      className="text-red-400 hover:scale-125 transition-transform px-1 font-bold"
                      title="Mute genre"
                      aria-label={`Mute ${g.name}`}
                    >
                      -
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COMBINED HELP & FAQ ACCORDION */}
      <div className="-mx-3 sm:-mx-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-lg">
        <button
          onClick={() => setIsHelpFaqDrawerOpen(!isHelpFaqDrawerOpen)}
          className="w-full flex justify-between items-center px-4 py-2.5 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
            HELP & USER GUIDE
          </span>
          <span className="text-[10px] font-bold text-[#8CFA96] transition-transform duration-200">
            {isHelpFaqDrawerOpen ? '▲' : '▼'}
          </span>
        </button>

        {isHelpFaqDrawerOpen && (
          <div className="p-4 space-y-4 border-t border-slate-800 animate-in fade-in text-xs text-slate-300">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setHelpSubTab('guide')}
                className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                  helpSubTab === 'guide'
                    ? 'bg-[#8CFA96] text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Feature Guide
              </button>
              <button
                type="button"
                onClick={() => setHelpSubTab('faq')}
                className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                  helpSubTab === 'faq'
                    ? 'bg-[#8CFA96] text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                FAQ
              </button>
            </div>

            {helpSubTab === 'guide' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="rounded-xl border border-[#8CFA96]/30 bg-[#8CFA96]/5 p-3.5 space-y-1">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-[#8CFA96]">
                    Mint TV — User Guide & Feature Overview
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Welcome to Mint TV! Track your favorite TV series and movies in one seamless experience.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#8CFA96]/20 text-[10px] font-black text-[#8CFA96]">
                      1
                    </span>
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                      Movie Tracking & Subscriptions
                    </h4>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8CFA96] block">
                      Free with Subscription vs Rent/Buy
                    </span>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Select your active subscriptions in the settings above. In Movie mode, titles currently included on your services automatically appear under <strong className="text-white">Free with Subscription</strong>, while other films display under <strong className="text-white">Available to Rent/Buy</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {helpSubTab === 'faq' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8CFA96] block ml-2">
                    Frequently Asked Questions
                  </span>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-1">
                    <h4 className="text-[11px] font-bold text-white">How does Mint TV know which movies are free to watch?</h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Mint TV matches streaming availability data powered by JustWatch against the services you configure in your <strong className="text-white">Streaming Subscriptions</strong> list.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* POP-UP LEVEL CARD */}
      {showLevelInfo && (
        <div className="rounded-2xl border border-slate-600 bg-slate-900 p-4 text-left shadow-2xl space-y-3 transition-all animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#8CFA96]">
              Collector Level System
            </span>
            <button
              onClick={() => setShowLevelInfo(false)}
              className="text-xs font-bold text-slate-300 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-300">
              <span>Current Progress</span>
              <span>{levelInfo.nextReq}</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8CFA96] transition-all duration-300"
                style={{ width: `${levelInfo.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* DATA & ACCOUNT MANAGEMENT CARD */}
      <div className="-mx-3 sm:-mx-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-lg">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
              Cloud Backup & Sync
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {currentUser ? currentUser.email : 'Not connected'}
            </span>
          </div>

          {currentUser ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="rounded-lg border border-[#8CFA96] bg-[#8CFA96]/10 px-3 py-1.5 text-xs font-bold text-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-950 transition-all"
            >
              Log In / Sign Up
            </button>
          )}
        </div>

        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
          <div className="space-y-0.5 pr-4">
            <span className="text-xs font-bold text-slate-200 block">
              Episode Air Date Alerts
            </span>
            <span className="text-[10px] text-slate-300 block">
              Get notified when shows on your watchlist release new episodes
            </span>
          </div>

          <button
            type="button"
            onClick={handlePushToggle}
            aria-label="Toggle Episode Air Date Alerts"
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              pushEnabled ? 'bg-[#8CFA96]' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow transition duration-200 ease-in-out ${
                pushEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="px-4 pt-2 pb-1 text-left bg-slate-900/30 border-b border-slate-800/80">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-300">
            Manual File Backup
          </span>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-800/80">
          <button
            onClick={handleExportData}
            className="flex items-center justify-center space-x-2 p-2 text-[11px] font-bold text-slate-300 hover:bg-slate-800/50 hover:text-[#8CFA96] transition-all"
          >
            <svg className="h-3.5 w-3.5 text-[#8CFA96]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Backup</span>
          </button>

          <label className="flex items-center justify-center space-x-2 p-2 text-[11px] font-bold text-slate-300 hover:bg-slate-800/50 hover:text-[#8CFA96] transition-all cursor-pointer">
            <svg className="h-3.5 w-3.5 text-[#8CFA96]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Backup</span>
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>
        </div>
      </div>

      {/* COPYRIGHT TEXT */}
      <div className="pt-3 pb-0 text-center text-[10px] font-medium text-slate-300 uppercase tracking-widest">
        © {new Date().getFullYear()} Mint Logic LLC. All rights reserved.
      </div>
    </div>
  );
}