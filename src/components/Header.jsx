import React, { useState, useEffect } from 'react';
import mintTvLogo from '../assets/mint-tv-logo.png';

export function Header({ onOpenSearch, onOpenProfile }) {
  const [profileName, setProfileName] = useState('TV Collector');
  const [customPhoto, setCustomPhoto] = useState('');

  useEffect(() => {
    const loadProfile = () => {
      const savedName = localStorage.getItem('mint_tv_user_name') || 'TV Collector';
      const savedPhoto = localStorage.getItem('mint_tv_user_photo') || '';
      setProfileName(savedName);
      setCustomPhoto(savedPhoto);
    };

    loadProfile(); // Initial load

    // Listen for the custom update event
    window.addEventListener('mint_tv_profile_update', loadProfile);
    return () => window.removeEventListener('mint_tv_profile_update', loadProfile);
  }, []);

  const initials = profileName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || 'TV';

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-[#0F172A] px-3.5 py-2 backdrop-blur-md">
      {/* Brand Logo - Increased size */}
      <div className="flex items-center">
        <img 
          src={mintTvLogo} 
          alt="Mint TV" 
          className="h-8 w-auto max-w-[160px] object-contain drop-shadow-[0_0_8px_rgba(140,250,150,0.25)]"
        />
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