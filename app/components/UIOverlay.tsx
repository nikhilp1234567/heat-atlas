'use client';

import React from 'react';
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
  return (
    <>
      {/* Header / Title - Minimal */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-white text-xl font-bold tracking-widest drop-shadow-md">
          HEAT<span className="text-red-500">ATLAS</span>
        </h1>
        <p className="text-xs text-gray-400 tracking-wider">LIVE HEAT ISLAND DATA</p>
      </div>

      {/* Vertical Slider */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 h-64 flex flex-col items-center gap-2">
        <Thermometer className="text-white/80 w-5 h-5" />
        <div className="relative h-full w-8 bg-gray-900/80 backdrop-blur-md rounded-full border border-gray-700 overflow-hidden shadow-lg">
           {/* Gradient Background representing temp */}
           <div className="absolute inset-0 bg-gradient-to-t from-blue-500 via-orange-500 to-red-600 opacity-80" />
           
           {/* The Input Range */}
           <input
             type="range"
             min="0"
             max="100"
             value={threshold}
             onChange={(e) => setThreshold(Number(e.target.value))}
             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
             style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any} 
             // Note: vertical slider support varies, we might need CSS transform if this fails, 
             // but standard implementation often uses rotation or specific props. 
             // For reliability cross-browser, let's use a standard CSS transform approach below if this is sketchy.
           />
           
           {/* Visual Indicator of 'Water Level' or 'Mask' */}
           {/* We mask the top part to show "filtering out" cooler temps? 
               Or we just show the slider handle? 
               Let's make a simple custom handle approach for visual clarity.
           */}
           <div 
             className="absolute bottom-0 left-0 right-0 bg-black/50 transition-all duration-75 pointer-events-none"
             style={{ height: `${threshold}%` }} 
           />
           {/* The "active" part is actually the part NOT masked if we think "Threshold" = "Hide below this".
               If threshold is 0, we see everything.
               If threshold is 100, we see nothing (masked fully).
               So if threshold is 50, bottom 50% is masked? 
               Actually, "Show temps >= threshold". 
               So if threshold is high (top), we filter out low temps.
           */}
        </div>
        <span className="text-xs font-mono text-white/80">{threshold}°</span>
      </div>

      {/* Bottom Sheet */}
      <div className="absolute bottom-6 left-4 right-4 z-20">
        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Find your city..." 
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
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
