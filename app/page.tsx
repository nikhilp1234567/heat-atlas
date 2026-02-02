'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Map } from 'maplibre-gl';
import UIOverlay from './components/UIOverlay';

// Dynamically import HeatMap to avoid SSR issues with window/canvas
const HeatMap = dynamic(() => import('./components/HeatMap'), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black flex items-center justify-center text-white/50">Initializing Heat Atlas...</div>
});

export default function Page() {
  const [thresholds, setThresholds] = useState({ absolute: 0, anomaly: 0 });
  const [mode, setMode] = useState<'absolute' | 'anomaly'>('absolute');
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [activeLocation, setActiveLocation] = useState<{ center: [number, number]; name: string } | null>(null);

  const currentThreshold = thresholds[mode];
  const setCurrentThreshold = useCallback((val: number) => {
    setThresholds(prev => ({ ...prev, [mode]: val }));
  }, [mode]);

  const handleMapLoad = useCallback((map: Map) => {
    setMapInstance(map);
  }, []);

  const handleLocationSelect = useCallback((loc: { center: [number, number]; name: string }) => {
    if (!mapInstance) return;

    setActiveLocation(loc); // Set active location for tooltip

    mapInstance.flyTo({
      center: loc.center,
      zoom: 12,
      speed: 1.2,
      curve: 1.42,
      easing: (t) => t,
      essential: true
    });
  }, [mapInstance]);

  return (
    <main className="relative w-full h-full bg-black">
      <HeatMap 
        threshold={currentThreshold} 
        mode={mode} 
        selectedLocation={activeLocation}
        onMapLoad={handleMapLoad} 
      />
      <UIOverlay 
        threshold={currentThreshold} 
        setThreshold={setCurrentThreshold} 
        mode={mode}
        setMode={setMode}
        onLocationSelect={handleLocationSelect} 
      />
    </main>
  );
}