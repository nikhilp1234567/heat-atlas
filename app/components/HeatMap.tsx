'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

interface HeatMapProps {
  threshold: number;
  mode: 'absolute' | 'anomaly';
  selectedLocation?: { center: [number, number]; name: string } | null;
  onMapLoad?: (map: maplibregl.Map) => void;
}

export default function HeatMap({ threshold, mode, selectedLocation, onMapLoad }: HeatMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (map.current) return;

    // Register PMTiles protocol
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-0.1276, 51.5074], // London
      zoom: 11,
      pitch: 0,
      bearing: 0
    });

    // Initialize Popup
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'custom-popup',
      maxWidth: '300px'
    });

    map.current.on('load', () => {
      setLoaded(true);
      if (onMapLoad && map.current) onMapLoad(map.current);

      // --- ABSOLUTE TEMP SOURCE ---
      const PMTILES_URL = 'https://b2xyufgbf31bjxw5.public.blob.vercel-storage.com/planet_heat.pmtiles?v=1.1'; 

      map.current!.addSource('heat-source', {
        type: 'vector',
        url: `pmtiles://${PMTILES_URL}`,
        attribution: '© OpenStreetMap contributors, © CartoDB'
      });

      // Absolute Temp Layers
      map.current!.addLayer({
        id: 'heat-fill',
        type: 'fill',
        source: 'heat-source',
        'source-layer': 'heat_layer',
        layout: { visibility: 'visible' },
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'temp'],
            0, '#3b82f6',   // Blue (Cool)
            25, '#22c55e',  // Green (Moderate)
            30, '#eab308',  // Yellow (Warm)
            35, '#f97316',  // Orange (Hot)
            40, '#ef4444',  // Red (Very Hot)
            50, '#b91c1c'   // Deep Red (Extreme)
          ],
          'fill-opacity': 0.6
        }
      });

      map.current!.addLayer({
        id: 'heat-line',
        type: 'line',
        source: 'heat-source',
        'source-layer': 'heat_layer',
        layout: { visibility: 'visible' },
        paint: {
          'line-color': [
            'interpolate',
            ['linear'],
            ['get', 'temp'],
            0, '#60a5fa',
            30, '#fde047',
            40, '#f87171',
            50, '#dc2626'
          ],
          'line-width': 1,
          'line-opacity': 0.8
        }
      });

      // --- ANOMALY SOURCE ---
      // Added cache buster to force load of new city-masked data
      const ANOMALY_URL = 'https://b2xyufgbf31bjxw5.public.blob.vercel-storage.com/planet_uhi_anomaly.pmtiles?v=1.1';

      map.current!.addSource('anomaly-source', {
        type: 'vector',
        url: `pmtiles://${ANOMALY_URL}`,
        attribution: '© OpenStreetMap contributors, © CartoDB'
      });

      // Anomaly Layers
      map.current!.addLayer({
        id: 'anomaly-fill',
        type: 'fill',
        source: 'anomaly-source',
        'source-layer': 'heat_island_layer', 
        layout: { visibility: 'visible' },
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'anomaly'],
            0, '#3b82f6',   // Blue (Neutral)
            2, '#22c55e',   // Green
            4, '#eab308',   // Yellow
            6, '#f97316',   // Orange
            8, '#ef4444',   // Red
            12, '#b91c1c'   // Deep Red
          ],
          'fill-opacity': 0 // Hidden by default (via opacity)
        }
      });

      map.current!.addLayer({
        id: 'anomaly-line',
        type: 'line',
        source: 'anomaly-source',
        'source-layer': 'heat_island_layer',
        layout: { visibility: 'visible' },
        paint: {
          'line-color': [
            'interpolate',
            ['linear'],
            ['get', 'anomaly'],
            0, '#60a5fa',
            4, '#fde047',
            8, '#f87171',
            12, '#dc2626'
          ],
          'line-width': 1,
          'line-opacity': 0 // Hidden by default
        }
      });

    });

  }, [onMapLoad]);

  // Handle Mode Switching using Opacity
  useEffect(() => {
    if (!loaded || !map.current) return;
    
    // We use opacity instead of visibility so we can query "hidden" layers for data
    const heatOpacity = mode === 'absolute' ? 0.6 : 0;
    const heatLineOpacity = mode === 'absolute' ? 0.8 : 0;
    
    const anomalyOpacity = mode === 'anomaly' ? 0.6 : 0;
    const anomalyLineOpacity = mode === 'anomaly' ? 0.8 : 0;

    if (map.current.getLayer('heat-fill')) map.current.setPaintProperty('heat-fill', 'fill-opacity', heatOpacity);
    if (map.current.getLayer('heat-line')) map.current.setPaintProperty('heat-line', 'line-opacity', heatLineOpacity);
    
    if (map.current.getLayer('anomaly-fill')) map.current.setPaintProperty('anomaly-fill', 'fill-opacity', anomalyOpacity);
    if (map.current.getLayer('anomaly-line')) map.current.setPaintProperty('anomaly-line', 'line-opacity', anomalyLineOpacity);

  }, [mode, loaded]);

  // Handle Live Threshold Filtering
  useEffect(() => {
    if (!loaded || !map.current) return;

    const filterHeat: maplibregl.FilterSpecification = ['>=', ['get', 'temp'], threshold];
    const filterAnomaly: maplibregl.FilterSpecification = ['>=', ['get', 'anomaly'], threshold];
    
    if (map.current.getLayer('heat-fill')) map.current.setFilter('heat-fill', filterHeat);
    if (map.current.getLayer('heat-line')) map.current.setFilter('heat-line', filterHeat);
    
    if (map.current.getLayer('anomaly-fill')) map.current.setFilter('anomaly-fill', filterAnomaly);
    if (map.current.getLayer('anomaly-line')) map.current.setFilter('anomaly-line', filterAnomaly);

  }, [threshold, loaded]);

  // Show Popup Logic
  const showPopup = (lngLat: maplibregl.LngLatLike) => {
    if (!map.current || !popupRef.current) return;

    const point = map.current.project(lngLat);
    const features = map.current.queryRenderedFeatures(point, {
      layers: ['heat-fill', 'anomaly-fill']
    });

    if (!features.length) {
      popupRef.current.remove();
      return;
    }

    const heatFeature = features.find(f => f.layer.id === 'heat-fill');
    const anomalyFeature = features.find(f => f.layer.id === 'anomaly-fill');

    const temp = heatFeature?.properties?.temp;
    const anomaly = anomalyFeature?.properties?.anomaly;

    let html = '';
    
    // Formatting helper
    const fmt = (n: number) => Math.round(n);

    if (mode === 'absolute') {
       if (temp !== undefined) {
         html = `
           <div class="flex flex-col gap-1 min-w-[100px]">
             <span class="text-xs uppercase tracking-wider text-gray-500 font-bold">Temperature</span>
             <span class="text-2xl font-bold text-gray-900">${fmt(temp)}°C</span>
           </div>
         `;
       }
    } else {
       // Anomaly Mode
       if (anomaly !== undefined) {
          const tempDisplay = temp !== undefined 
            ? `<div class="pt-2 mt-2 border-t border-gray-200 flex justify-between items-center">
                 <span class="text-xs text-gray-500">Abs. Temp</span>
                 <span class="text-sm font-semibold text-gray-700">${fmt(temp)}°C</span>
               </div>` 
            : '';
          
          html = `
             <div class="flex flex-col gap-1 min-w-[120px]">
               <span class="text-xs uppercase tracking-wider text-gray-500 font-bold">Heat Island</span>
               <span class="text-2xl font-bold text-red-600">+${fmt(anomaly)}°C</span>
               ${tempDisplay}
             </div>
          `;
       }
    }

    if (html) {
      popupRef.current
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(map.current);
    } else {
      popupRef.current.remove();
    }
  };

  // Click Listener
  useEffect(() => {
    if (!loaded || !map.current) return;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      showPopup(e.lngLat);
    };

    map.current.on('click', onClick);
    return () => {
      if (map.current) map.current.off('click', onClick);
    };
  }, [loaded, mode]); // Re-bind when mode changes to update popup content logic

  // Handle Search Selection (Auto-Popup)
  useEffect(() => {
    if (!loaded || !map.current || !selectedLocation) return;

    const onMoveEnd = () => {
      // Once map finishes flying, try to show popup at the center
      showPopup(selectedLocation.center);
    };

    map.current.once('moveend', onMoveEnd);

    // Cleanup: if component unmounts or location changes before moveend, remove listener
    return () => {
      if (map.current) map.current.off('moveend', onMoveEnd);
    };
  }, [selectedLocation, loaded]);

  return (
    <div ref={mapContainer} className="map-container" />
  );
}
