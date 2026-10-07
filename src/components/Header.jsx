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
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/80 bg-[#0F172A]/90 px-4 py-3 backdrop-blur-md">
      {/* Brand Logo with SVG Icon */}
      <div className="flex items-center space-x-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8CFA96]/10 border border-[#8CFA96]/30 text-[#8CFA96]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4L12 9L17 4M3 9H21V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V9Z" />
          </svg>
        </div>
        <h1 className="text-base font-black tracking-tight text-white">
          MINT <span className="text-[#8CFA96]">TV</span>
        </h1>
      </div>

      {/* Action Controls & Scaled-Down Profile Avatar */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenDiscover}
          className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:border-slate-700 hover:text-white transition-all"
        >
          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Finder</span>
        </button>

        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-1 rounded-lg border border-[#8CFA96]/30 bg-[#8CFA96]/10 px-2.5 py-1.5 text-xs font-bold text-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-950 transition-all"
        >
          <span>+ Add</span>
        </button>

        {/* Scaled-down Profile Avatar Button */}
        <button
          onClick={onOpenProfile}
          title="User Profile & Stats"
          aria-label="User profile and stats"
          className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#8CFA96]/50 bg-slate-900 text-[10px] font-black text-[#8CFA96] shadow-sm hover:border-[#8CFA96] transition-all ml-1"
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