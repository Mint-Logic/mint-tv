import React, { useState, useEffect } from 'react';

export function Header({ onOpenSearch, onOpenDiscover, onOpenProfile }) {
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
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/80 bg-[#0F172A]/90 px-3.5 py-2.5 backdrop-blur-md">
      {/* Brand Logo with Custom TV App Icon SVG & Orbitron Font */}
      <div className="flex items-center space-x-1.5">
        <svg 
          viewBox="0 0 512 512" 
          className="h-7 w-7 shrink-0" 
          fill="none"
        >
          {/* Outer App Frame Tile */}
          <rect 
            x="12" 
            y="12" 
            width="488" 
            height="488" 
            rx="110" 
            fill="#0D1527" 
            stroke="#1E2B3E" 
            strokeWidth="24" 
          />
          
          {/* Left Antenna */}
          <line 
            x1="150" 
            y1="100" 
            x2="202" 
            y2="162" 
            stroke="#8CFA96" 
            strokeWidth="22" 
            strokeLinecap="round" 
          />
          
          {/* Right Antenna */}
          <line 
            x1="362" 
            y1="100" 
            x2="310" 
            y2="162" 
            stroke="#8CFA96" 
            strokeWidth="22" 
            strokeLinecap="round" 
          />

          {/* TV Body Frame */}
          <rect 
            x="112" 
            y="162" 
            width="288" 
            height="208" 
            rx="42" 
            fill="#080D1A" 
            stroke="#25354C" 
            strokeWidth="16" 
          />

          {/* Status Light Dot */}
          <circle 
            cx="358" 
            cy="196" 
            r="8" 
            fill="#8CFA96" 
          />

          {/* Play Triangle */}
          <path 
            d="M236 226 L308 266 L236 306 Z" 
            fill="#8CFA96" 
          />
        </svg>

        <h1 
          style={{ fontFamily: "'Orbitron', sans-serif" }} 
          className="text-sm font-black tracking-normal text-white"
        >
          Mint<span className="text-[#8CFA96]">TV</span>
        </h1>
      </div>

      {/* Action Controls & Compact Profile Avatar */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onOpenDiscover}
          className="flex items-center space-x-1 rounded-md border border-slate-800 bg-slate-900/90 px-2 py-1 text-[11px] font-bold text-slate-300 hover:border-slate-700 hover:text-white transition-all"
        >
          <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Finder</span>
        </button>

        <button
          onClick={onOpenSearch}
          className="flex items-center rounded-md border border-[#8CFA96]/30 bg-[#8CFA96]/10 px-2 py-1 text-[11px] font-bold text-[#8CFA96] hover:bg-[#8CFA96] hover:text-slate-950 transition-all"
        >
          <span>+ Add</span>
        </button>

        {/* Scaled-down Profile Avatar Button */}
        <button
          onClick={onOpenProfile}
          title="User Profile & Stats"
          aria-label="User profile and stats"
          className="relative flex h-6.5 w-6.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#8CFA96]/50 bg-slate-900 text-[11px] font-black text-[#8CFA96] shadow-sm hover:border-[#8CFA96] transition-all ml-0.5"
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