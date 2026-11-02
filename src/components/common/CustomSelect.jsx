import React, { useState, useRef, useEffect } from 'react';

export function CustomSelect({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((o) => String(o.id) === String(value));

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between rounded-xl border bg-slate-900 pl-2.5 pr-2 py-2 text-[10px] sm:text-[11px] font-bold text-left transition-all ${
          isOpen
            ? 'border-[#8CFA96] ring-1 ring-[#8CFA96]/30 text-white'
            : value !== 'all'
            ? 'border-[#8CFA96]/50 text-[#8CFA96]'
            : 'border-slate-700 text-slate-200 hover:border-slate-500'
        }`}
      >
        <span className="truncate pr-1">
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <svg
          className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#8CFA96]' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Styled Theme Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[140px] max-h-60 overflow-y-auto no-scrollbar rounded-xl border border-slate-700 bg-[#1E293B] p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95">
          {options.map((opt) => {
            const isSelected = String(opt.id) === String(value);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-colors text-left ${
                  isSelected
                    ? 'bg-[#8CFA96]/15 text-[#8CFA96]'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="truncate">{opt.name}</span>
                {isSelected && (
                  <span className="text-[#8CFA96] text-[10px] font-black pl-1">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}