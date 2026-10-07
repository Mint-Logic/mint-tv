import React, { useState, useEffect } from 'react';

const GRADIENT_THEMES = [
  { id: 'mint', name: 'Mint Slate', bg: 'from-emerald-600 to-slate-900 border-[#8CFA96]', text: 'text-[#8CFA96]' },
  { id: 'cyber', name: 'Cyber Blue', bg: 'from-cyan-600 to-slate-900 border-cyan-400', text: 'text-cyan-300' },
  { id: 'neon', name: 'Neon Purple', bg: 'from-purple-600 to-slate-900 border-purple-400', text: 'text-purple-300' },
  { id: 'amber', name: 'Warm Amber', bg: 'from-amber-600 to-slate-900 border-amber-400', text: 'text-amber-300' },
];

export function StatsDashboard({ watchlist }) {
  const [profileName, setProfileName] = useState(() => {
    return localStorage.getItem('mint_tv_user_name') || 'TV Collector';
  });
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('mint_tv_user_theme') || 'mint';
  });
  const [customPhoto, setCustomPhoto] = useState(() => {
    return localStorage.getItem('mint_tv_user_photo') || '';
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    localStorage.setItem('mint_tv_user_name', profileName);
    localStorage.setItem('mint_tv_user_theme', themeId);
    localStorage.setItem('mint_tv_user_photo', customPhoto);
  }, [profileName, themeId, customPhoto]);

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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCustomPhoto(reader.result);
      reader.readAsDataURL(file);
    }
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
    <div className="space-y-6">
      {/* Main Profile Header */}
      <div className="relative rounded-2xl border border-slate-800 bg-[#1E293B] p-5 text-center shadow-2xl">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="absolute top-3 right-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-[#8CFA96] hover:bg-slate-800 transition-all"
        >
          {isEditing ? 'Done' : 'Edit Profile'}
        </button>

        {/* Profile Avatar Container */}
        <div className="relative mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full shadow-2xl">
          {customPhoto ? (
            <img src={customPhoto} alt="Profile" className="h-full w-full object-cover border-2 border-[#8CFA96] rounded-full" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br border-2 rounded-full font-black text-3xl tracking-wider shadow-inner ${activeTheme.bg} ${activeTheme.text}`}>
              {initials}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4 pt-2 text-left">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Display Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-[#8CFA96] focus:outline-none"
              />
            </div>

            {/* Custom Photo Upload */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Upload Custom Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8CFA96] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-900 hover:file:opacity-90"
              />
              {customPhoto && (
                <button
                  onClick={() => setCustomPhoto('')}
                  className="mt-2 text-[10px] text-red-400 underline font-semibold block"
                >
                  Remove custom picture
                </button>
              )}
            </div>

            {/* Accent Theme Picker */}
            {!customPhoto && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Avatar Theme Accent
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {GRADIENT_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setThemeId(theme.id)}
                      className={`h-11 rounded-xl border bg-gradient-to-br ${theme.bg} transition-all flex items-center justify-center font-black text-sm ${
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
        ) : (
          <div>
            <h2 className="text-lg font-extrabold text-white">{profileName}</h2>
            <p className="mt-0.5 text-xs text-slate-400 font-medium">TV & Movie Collector</p>
          </div>
        )}
      </div>

      {/* Viewing Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-4 text-center shadow-md">
          <div className="text-2xl font-black text-[#8CFA96]">{totalEpisodesWatched}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Episodes Watched
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-4 text-center shadow-md">
          <div className="text-2xl font-black text-[#8CFA96]">
            {days}d {hours}h
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Time Watched
          </div>
        </div>
      </div>

      {/* Data Export / Backup Section */}
      <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Backup & Data Export
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handleExportData}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs font-bold text-[#8CFA96] hover:bg-slate-800 transition-all"
          >
            📥 Export Backup (.json)
          </button>
          <label className="flex-1 text-center rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer">
            📤 Import Backup
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}