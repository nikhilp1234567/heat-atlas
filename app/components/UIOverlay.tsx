'use client';

import React, { useState } from 'react';
import { Search, MapPin, Thermometer } from 'lucide-react';

interface UIOverlayProps {
  threshold: number;
  setThreshold: (val: number) => void;
  onLocationSelect: (loc: { center: [number, number]; name: string }) => void;
}

const FEATURED_LOCATIONS = [
  { name: 'London', center: [-0.1276, 51.5074] as [number, number] },
  { name: 'Tokyo', center: [139.6917, 35.6895] as [number, number] },
  { name: 'Phoenix', center: [-112.0740, 33.4484] as [number, number] },
  { name: 'Paris', center: [2.3522, 48.8566] as [number, number] },
];

export default function UIOverlay({ threshold, setThreshold, onLocationSelect }: UIOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          const result = data[0];
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);
          
          onLocationSelect({
            center: [lon, lat],
            name: result.name || result.display_name.split(',')[0]
          });
          setSearchQuery(''); // Clear search on success
        } else {
          alert('Location not found. Please try another city.');
        }
      } catch (error) {
        console.error('Search failed:', error);
        alert('Search failed. Please check your connection.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <>
      {/* Header / Title - Minimal */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-white text-xl font-bold tracking-widest drop-shadow-md">
          THERMAL<span className="text-red-500">SCANNER</span>
        </h1>
        <p className="text-xs text-gray-400 tracking-wider">LIVE HEAT ISLAND DATA</p>
      </div>

      {/* Vertical Slider Wrapper */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 h-64 flex flex-col items-center gap-2">
        <Thermometer className="text-white/80 w-5 h-5" />
        
        {/* 
            Slider Container 
            We use a standard horizontal slider and rotate it -90deg.
            Dimensions must be swapped essentially. Width of this container determines the physical height of the slider on screen.
        */}
        <div className="relative w-8 h-full bg-gray-900/80 backdrop-blur-md rounded-full border border-gray-700 shadow-lg flex items-center justify-center overflow-hidden">
           
           {/* Gradient Background */}
           <div className="absolute inset-0 bg-gradient-to-t from-blue-500 via-orange-500 to-red-600 opacity-80" />

           {/* Masking overlay (The black part that covers the gradient based on threshold) */}
           {/* 
              If threshold is 0 (bottom), we want to see everything (or nothing?). 
              Logic: "Show heat >= threshold". 
              Low threshold = Show all heat (Blue to Red). 
              High threshold = Show only Red.
              
              So if threshold is 0, we mask nothing? Or we mimic the "rising water" level?
              Usually a slider fill represents the value. 
              Let's make the "active" part the colored part. 
              If value is 0, bar is empty. If value is 100, bar is full.
           */}
           <div 
             className="absolute top-0 left-0 right-0 bg-black/60 transition-all duration-75 pointer-events-none"
             style={{ height: `${100 - threshold}%` }} 
           />

           {/* 
              Rotated Input 
              The input itself is horizontal (width: 256px, height: 32px), then rotated.
              We center it absolutely.
           */}
           <input
             type="range"
             min="0"
             max="100"
             value={threshold}
             onChange={(e) => setThreshold(Number(e.target.value))}
             className="absolute w-[250px] h-8 opacity-0 cursor-pointer z-10"
             style={{ 
               transform: 'rotate(-90deg)', 
               transformOrigin: 'center',
             }} 
           />
        </div>
        <span className="text-xs font-mono text-white/80">{threshold}°</span>
      </div>

      {/* Bottom Sheet */}
      <div className="absolute bottom-6 left-4 right-4 z-20">
        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 ${isSearching ? 'animate-pulse text-red-400' : ''}`} />
            <input 
              type="text" 
              placeholder={isSearching ? "Locating..." : "Find your city..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              disabled={isSearching}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Featured Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-gradient-right">
            {FEATURED_LOCATIONS.map((loc) => (
              <button
                key={loc.name}
                onClick={() => onLocationSelect(loc)}
                className="flex items-center gap-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-gray-200 whitespace-nowrap transition-colors"
              >
                <MapPin className="w-3 h-3 text-red-400" />
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}