import React, { useState, useEffect } from 'react';

export function Header({ onOpenSearch, onOpenProfile }) {
  const [profileName, setProfileName] = useState('TV Collector');
  const [customPhoto, setCustomPhoto] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('mint_tv_user_name') || 'TV Collector';
    const savedPhoto = localStorage.getItem('mint_tv_user_photo') || '';
    setProfileName(savedName);
    setCustomPhoto(savedPhoto);
  }, []);

  const initials = profileName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || 'TV';

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-[#0F172A] px-3.5 py-2.5 backdrop-blur-md">
      {/* Brand Logo */}
      <div className="flex items-center space-x-1.5">
        <svg viewBox="0 0 512 512" className="h-8 w-8 shrink-0 drop-shadow-[0_0_8px_rgba(140,250,150,0.25)]" fill="none">
          <defs>
            <filter id="mintDotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="16" y="16" width="480" height="480" rx="110" fill="#1E293B" stroke="#8CFA96" strokeWidth="20" />
          <line x1="150" y1="100" x2="202" y2="162" stroke="#8CFA96" strokeWidth="26" strokeLinecap="round" />
          <line x1="362" y1="100" x2="310" y2="162" stroke="#8CFA96" strokeWidth="26" strokeLinecap="round" />
          <rect x="112" y="162" width="288" height="208" rx="42" fill="#0F172A" stroke="#8CFA96" strokeWidth="18" />
          <rect x="348" y="188" width="20" height="20" rx="3" fill="#8CFA96" filter="url(#mintDotGlow)" />
          <path d="M236 226 L308 266 L236 306 Z" fill="#FFFFFF" />
        </svg>

        <h1 
          style={{ fontFamily: "'Orbitron', sans-serif" }} 
          className="text-lg font-bold tracking-normal text-white"
        >
          Mint<span className="text-[#8CFA96]">TV</span>
        </h1>
      </div>

      {/* Action Controls & Compact Profile Avatar */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-1 rounded-md border border-[#8CFA96]/40 bg-[#8CFA96]/10 px-2.5 py-1 text-xs font-extrabold text-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-950 transition-all"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Show</span>
        </button>

        {/* Scaled-down Profile Avatar Button */}
        <button
          onClick={onOpenProfile}
          title="User Profile & Stats"
          aria-label="User profile and stats"
          className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#8CFA96]/50 bg-slate-900 text-xs font-black text-[#8CFA96] shadow-sm hover:border-[#8CFA96] transition-all"
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