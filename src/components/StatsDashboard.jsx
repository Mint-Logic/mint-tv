import React, { useState, useEffect, useRef } from 'react';

const GRADIENT_THEMES = [
  { id: 'mint', name: 'Mint Slate', bg: 'from-emerald-500 to-emerald-900 border-[#8CFA96]', text: 'text-[#8CFA96]' },
  { id: 'cyber', name: 'Cyber Blue', bg: 'from-cyan-500 to-cyan-900 border-cyan-400', text: 'text-cyan-300' },
  { id: 'neon', name: 'Neon Purple', bg: 'from-purple-500 to-purple-900 border-purple-400', text: 'text-purple-300' },
  { id: 'amber', name: 'Warm Amber', bg: 'from-amber-500 to-amber-900 border-amber-400', text: 'text-amber-300' },
];

export function StatsDashboard({ watchlist }) {
  const [profileName, setProfileName] = useState(() => {
    return localStorage.getItem('mint_tv_user_name') || 'Peace Toes';
  });
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('mint_tv_user_theme') || 'mint';
  });
  const [customPhoto, setCustomPhoto] = useState(() => {
    return localStorage.getItem('mint_tv_user_photo') || '';
  });
  
  const [photoPos, setPhotoPos] = useState(() => {
    const saved = localStorage.getItem('mint_tv_photo_pos');
    return saved ? JSON.parse(saved) : { x: 0, y: 0, scale: 1 };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try {
      localStorage.setItem('mint_tv_user_name', profileName);
      localStorage.setItem('mint_tv_user_theme', themeId);
      localStorage.setItem('mint_tv_user_photo', customPhoto);
      localStorage.setItem('mint_tv_photo_pos', JSON.stringify(photoPos));
    } catch (e) {
      console.warn('LocalStorage limit reached while saving photo settings', e);
    }
  }, [profileName, themeId, customPhoto, photoPos]);

  const totalEpisodesWatched = watchlist.reduce(
    (acc, show) => acc + (show.currentEpisode || 1) - 1,
    0
  );
  const totalMinutes = totalEpisodesWatched * 45;
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);

  const activeTheme = GRADIENT_THEMES.find((t) => t.id === themeId) || GRADIENT_THEMES[0];

  const initials = profileName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'TV';

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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(watchlist, null, 2));
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
          if (Array.isArray(importedData)) {
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

  return (
    <div className="space-y-5">
      {/* PROFILE HEADER HERO */}
      <div className="flex flex-col items-center text-center pt-2 pb-1">
        {/* Avatar Ring */}
        <div
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className={`relative mb-3 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#8CFA96] bg-slate-900 shadow-xl shadow-[#8CFA96]/15 ${
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
            <div className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br text-[38px] font-black tracking-wider leading-none text-[#8CFA96] select-none ${activeTheme.bg}`}>
              <span className="translate-x-[1px]">{initials}</span>
            </div>
          )}
        </div>

        {!isEditing ? (
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white tracking-tight">{profileName}</h2>
            <p className="text-xs font-semibold text-slate-400">TV & Movie Collector</p>

            <button
              onClick={() => setIsEditing(true)}
              className="mt-2.5 inline-flex items-center space-x-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3.5 py-1 text-[11px] font-bold text-[#8CFA96] hover:bg-slate-800 transition-all"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit Profile</span>
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
                Done
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
                    Drag photo above to position
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

            {!customPhoto && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5">
                  Avatar Theme
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {GRADIENT_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setThemeId(theme.id)}
                      className={`h-9 rounded-xl border bg-gradient-to-br ${theme.bg} transition-all flex items-center justify-center font-bold text-xs ${
                        themeId === theme.id ? 'ring-2 ring-white scale-105' : 'opacity-70'
                      }`}
                    >
                      {initials}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL-WIDTH STREAMLINED STATS ROWS */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-lg divide-y divide-slate-800/80">
        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8CFA96]/10 border border-[#8CFA96]/30 text-[#8CFA96]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-extrabold text-slate-300">Episodes Watched</span>
          </div>
          <span className="text-base font-black text-[#8CFA96]">{totalEpisodesWatched}</span>
        </div>

        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8CFA96]/10 border border-[#8CFA96]/30 text-[#8CFA96]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-extrabold text-slate-300">Total Time Watched</span>
          </div>
          <div className="text-base font-black text-[#8CFA96]">
            {days}d <span className="text-[#8CFA96]">{hours}h</span>
          </div>
        </div>
      </div>

      {/* BACKUP & DATA ACTIONS */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] shadow-lg">
        <div className="px-3.5 pt-3 pb-1 border-b border-slate-800/80 text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Data Management
          </span>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-800/80">
          <button
            onClick={handleExportData}
            className="flex items-center justify-center space-x-2 p-3 text-xs font-bold text-slate-300 hover:bg-slate-800/50 hover:text-[#8CFA96] transition-all"
          >
            <svg className="h-4 w-4 text-[#8CFA96]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Backup</span>
          </button>

          <label className="flex items-center justify-center space-x-2 p-3 text-xs font-bold text-slate-300 hover:bg-slate-800/50 hover:text-[#8CFA96] transition-all cursor-pointer">
            <svg className="h-4 w-4 text-[#8CFA96]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Backup</span>
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}