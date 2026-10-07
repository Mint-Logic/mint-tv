import React, { useState, useEffect } from 'react';

export function Header({ onOpenSearch, onOpenDiscover, onOpenProfile }) {
  const [profileName, setProfileName] = useState('TV Collector');
  const [customPhoto, setCustomPhoto] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('mint_tv_user_name') || 'TV Collector';
    const savedPhoto = localStorage.getItem('mint_tv_user_photo') || '';
    setProfileName(savedName);
    setCustomPhoto(savedPhoto);
  });

  const initials = profileName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || 'TV';

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-[#0F172A]/90 p-4 backdrop-blur-md">
      {/* Brand Logo */}
      <div className="flex items-center space-x-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#8CFA96]"></span>
        <h1 className="text-xl font-extrabold tracking-tight text-white">
          MINT <span className="text-[#8CFA96]">TV</span>
        </h1>
      </div>

      {/* Action Controls & Dynamic Profile Avatar */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenDiscover}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
        >
          🔍 Finder
        </button>
        <button
          onClick={onOpenSearch}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-[#8CFA96] hover:bg-slate-700 transition-all"
        >
          + Add
        </button>

        {/* Dynamic Profile Avatar Button with larger text */}
        <button
          onClick={onOpenProfile}
          title="User Profile & Stats"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#8CFA96] bg-slate-800 text-sm font-black text-[#8CFA96] shadow-md hover:scale-105 transition-all ml-1"
        >
          {customPhoto ? (
            <img src={customPhoto} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="leading-none">{initials}</span>
          )}
        </button>
      </div>
    </header>
  );
}