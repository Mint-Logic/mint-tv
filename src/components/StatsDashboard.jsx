import React, { useState, useEffect, useRef } from 'react';

const PRESET_TITLES = [
  'TV & Movie Collector',
  'Binge Architect',
  'Couch Potato Supreme',
  'Subtitle Specialist',
  'Cinema Connoisseur',
  'Custom...',
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

export function StatsDashboard({ watchlist }) {
  const [profileName, setProfileName] = useState(() => {
    return localStorage.getItem('mint_tv_user_name') || 'Peace Toes';
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

  // Genre Preference States
  const [likedGenres, setLikedGenres] = useState(() => {
    const saved = localStorage.getItem('mint_tv_liked_genres');
    return saved ? JSON.parse(saved) : [10765, 18, 35, 99];
  });

  const [mutedGenres, setMutedGenres] = useState(() => {
    const saved = localStorage.getItem('mint_tv_muted_genres');
    return saved ? JSON.parse(saved) : [10764, 10767, 10766];
  });

  // Specific Tuning Rules
  const [excludeAnime, setExcludeAnime] = useState(() => {
    return localStorage.getItem('mint_tv_exclude_anime') === 'true';
  });

  const [excludeTrueCrime, setExcludeTrueCrime] = useState(() => {
    return localStorage.getItem('mint_tv_exclude_true_crime') === 'true';
  });

  const [boostNature, setBoostNature] = useState(() => {
    return localStorage.getItem('mint_tv_boost_nature') === 'true';
  });

  // Accordion state
  const [isGenreDrawerOpen, setIsGenreDrawerOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try {
      localStorage.setItem('mint_tv_user_name', profileName);
      localStorage.setItem('mint_tv_user_title', profileTitle);
      localStorage.setItem('mint_tv_user_photo', customPhoto);
      localStorage.setItem('mint_tv_photo_pos', JSON.stringify(photoPos));
      localStorage.setItem('mint_tv_liked_genres', JSON.stringify(likedGenres));
      localStorage.setItem('mint_tv_muted_genres', JSON.stringify(mutedGenres));
      localStorage.setItem('mint_tv_exclude_anime', excludeAnime);
      localStorage.setItem('mint_tv_exclude_true_crime', excludeTrueCrime);
      localStorage.setItem('mint_tv_boost_nature', boostNature);
      
      // Dispatch event to instantly update Header without refresh
      window.dispatchEvent(new Event('mint_tv_profile_update'));
    } catch (e) {
      console.warn('LocalStorage limit reached while saving profile settings', e);
    }
  }, [profileName, profileTitle, customPhoto, photoPos, likedGenres, mutedGenres, excludeAnime, excludeTrueCrime, boostNature]);

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
    // Exact trophy SVG path from your layout
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
        nextReq: `${episodes}/5000 eps to Lvl 5`,
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
      color: 'text-slate-300 border-slate-700 bg-slate-800/60',
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
        likedGenres,
        mutedGenres,
        excludeAnime,
        excludeTrueCrime,
        boostNature,
      },
      watchlist: watchlist,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mint_tv_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
            if (importedData.profile) {
              if (importedData.profile.name) localStorage.setItem('mint_tv_user_name', importedData.profile.name);
              if (importedData.profile.title) localStorage.setItem('mint_tv_user_title', importedData.profile.title);
              if (importedData.profile.photo) localStorage.setItem('mint_tv_user_photo', importedData.profile.photo);
              if (importedData.profile.photoPos) localStorage.setItem('mint_tv_photo_pos', JSON.stringify(importedData.profile.photoPos));
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
    <div className="space-y-1 relative">
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
              alt="Profile"
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
            <p className="text-xs font-semibold text-slate-400">{profileTitle}</p>

            <button
              onClick={() => setIsEditing(true)}
              className="mt-1.5 inline-flex items-center space-x-1 rounded-full border border-slate-800 bg-slate-900/50 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-all"
            >
              <svg className="h-2.5 w-2.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit</span>
            </button>
          </div>
        ) : (
          <div className="w-full mt-3 space-y-3.5 rounded-2xl border border-slate-800 bg-[#1E293B] p-4 text-left shadow-lg">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
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
              <label className="text-[10px] font-bold text-slate-400">Display Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-[#8CFA96] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                Profile Title
              </label>
              <select
                value={selectedDropdownOption}
                onChange={handleTitleDropdownChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-[#8CFA96] focus:outline-none cursor-pointer"
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
                    <label className="text-[9px] font-bold text-slate-400">Custom Title Text</label>
                    <span className="text-[9px] font-bold text-slate-500">
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-[#8CFA96] focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                Upload Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8CFA96] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-900 hover:file:opacity-90 cursor-pointer"
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
                    className="text-[10px] text-slate-400 hover:text-white underline"
                  >
                    Reset
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
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
              className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-[10px] font-black text-slate-400 hover:border-[#8CFA96] hover:text-[#8CFA96] transition-all"
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

      {/* MINIMALIST GENRE PREFERENCES ACCORDION */}
      <div className="-mx-3 sm:-mx-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-lg">
        <button
          onClick={() => setIsGenreDrawerOpen(!isGenreDrawerOpen)}
          className="w-full flex justify-between items-center px-4 py-2.5 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            MANAGE GENRE PREFERENCES
          </span>
          <span className="text-[10px] font-bold text-[#8CFA96] transition-transform duration-200">
            {isGenreDrawerOpen ? '▲' : '▼'}
          </span>
        </button>

        {isGenreDrawerOpen && (
          <div className="p-4 space-y-4 border-t border-slate-800 animate-in fade-in">
            {/* SPECIALIZED DISCOVERY TUNING RULES */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8CFA96] block">
                Discovery Tuning Rules
              </span>

              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeAnime}
                  onChange={(e) => setExcludeAnime(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-[#8CFA96] focus:ring-0 accent-[#8CFA96]"
                />
                <span className="text-xs font-bold text-slate-200">
                  Exclude Anime <span className="text-[10px] font-normal text-slate-400">(Block Japanese Anime, keep Western animation)</span>
                </span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeTrueCrime}
                  onChange={(e) => setExcludeTrueCrime(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-[#8CFA96] focus:ring-0 accent-[#8CFA96]"
                />
                <span className="text-xs font-bold text-slate-200">
                  Exclude True Crime <span className="text-[10px] font-normal text-slate-400">(Filter out murder/serial killer docuseries)</span>
                </span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={boostNature}
                  onChange={(e) => setBoostNature(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-[#8CFA96] focus:ring-0 accent-[#8CFA96]"
                />
                <span className="text-xs font-bold text-slate-200">
                  Boost Nature & Wildlife <span className="text-[10px] font-normal text-slate-400">(Prioritize nature docs in recommendations)</span>
                </span>
              </label>
            </div>

            {/* LIKED CATEGORY */}
            <div className="rounded-xl border border-[#8CFA96]/30 bg-[#8CFA96]/5 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8CFA96]">
                  Liked ({likedGenreObjects.length})
                </span>
                <span className="text-[9px] text-slate-400">Boosted in discovery</span>
              </div>

              {likedGenreObjects.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">No liked genres selected.</p>
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
                        className="text-slate-400 hover:text-white pl-1"
                        title="Move to neutral"
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
                <span className="text-[9px] text-slate-400">Hidden from discovery</span>
              </div>

              {mutedGenreObjects.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">No muted genres.</p>
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
                        className="text-slate-400 hover:text-white pl-1"
                        title="Move to neutral"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* NEUTRAL / AVAILABLE CATEGORY */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Neutral / Available Genres ({neutralGenreObjects.length})
              </span>

              <div className="flex flex-wrap gap-1.5">
                {neutralGenreObjects.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 text-[11px] font-semibold"
                  >
                    <span>{g.name}</span>
                    <button
                      onClick={() => moveGenre(g.id, 'liked')}
                      className="text-[#8CFA96] hover:scale-125 transition-transform px-1 font-bold"
                      title="Like genre"
                    >
                      +
                    </button>
                    <button
                      onClick={() => moveGenre(g.id, 'muted')}
                      className="text-red-400 hover:scale-125 transition-transform px-1 font-bold"
                      title="Mute genre"
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

      {/* POP-UP INFO CARD FOR LEVEL SYSTEM EXPLANATION */}
      {showLevelInfo && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left shadow-2xl space-y-3 transition-all animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#8CFA96]">
              Collector Level System
            </span>
            <button
              onClick={() => setShowLevelInfo(false)}
              className="text-xs font-bold text-slate-400 hover:text-white"
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

          <div className="space-y-1.5 pt-1 text-[11px] font-bold">
            <div className="flex justify-between text-slate-400">
              <span>Level 1: NOVICE</span>
              <span>0 - 249 eps</span>
            </div>
            <div className="flex justify-between text-[#8CFA96]">
              <span>Level 2: MARATHONER</span>
              <span>250 - 999 eps</span>
            </div>
            <div className="flex justify-between text-cyan-300">
              <span>Level 3: AUTEUR</span>
              <span>1,000 - 2,499 eps</span>
            </div>
            <div className="flex justify-between text-purple-300">
              <span>Level 4: CULTIST</span>
              <span>2,500 - 4,999 eps</span>
            </div>
            <div className="flex justify-between text-amber-300">
              <span>Level 5: LEGEND</span>
              <span>5,000+ eps</span>
            </div>
          </div>
        </div>
      )}

      {/* DATA MANAGEMENT CARD */}
      <div className="-mx-3 sm:-mx-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-lg">
        <div className="px-4 pt-2 pb-1 border-b border-slate-800/80 text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Data Management
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
      <div className="pt-3 pb-0 text-center text-[8px] font-medium text-slate-500 uppercase tracking-widest">
        © {new Date().getFullYear()} Mint Logic LLC. All rights reserved.
      </div>
    </div>
  );
}