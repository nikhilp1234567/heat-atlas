'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

interface HeatMapProps {
  threshold: number;
  mode: 'absolute' | 'anomaly';
  onMapLoad?: (map: maplibregl.Map) => void;
}

export default function HeatMap({ threshold, mode, onMapLoad }: HeatMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

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

    map.current.on('load', () => {
      setLoaded(true);
      if (onMapLoad && map.current) onMapLoad(map.current);

      // --- ABSOLUTE TEMP SOURCE ---
      const PMTILES_URL = 'https://b2xyufgbf31bjxw5.public.blob.vercel-storage.com/planet_heat.pmtiles'; 

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
      const ANOMALY_URL = 'https://b2xyufgbf31bjxw5.public.blob.vercel-storage.com/planet_uhi_anomaly.pmtiles';

      map.current!.addSource('anomaly-source', {
        type: 'vector',
        url: `pmtiles://${ANOMALY_URL}`,
        attribution: '© OpenStreetMap contributors, © CartoDB'
      });

      // Anomaly Layers
      // Assuming 'temp' or similar property exists. 
      // Using a 0-12 scale for Heat Island Effect (degrees delta).
      map.current!.addLayer({
        id: 'anomaly-fill',
        type: 'fill',
        source: 'anomaly-source',
        'source-layer': 'heat_island_layer', 
        layout: { visibility: 'none' }, // Hidden by default
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
          'fill-opacity': 0.6
        }
      });

      map.current!.addLayer({
        id: 'anomaly-line',
        type: 'line',
        source: 'anomaly-source',
        'source-layer': 'heat_island_layer',
        layout: { visibility: 'none' },
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
          'line-opacity': 0.8
        }
      });

    });

  }, [onMapLoad]);

  // Handle Mode Switching
  useEffect(() => {
    if (!loaded || !map.current) return;
    
    const absoluteVisibility = mode === 'absolute' ? 'visible' : 'none';
    const anomalyVisibility = mode === 'anomaly' ? 'visible' : 'none';

    if (map.current.getLayer('heat-fill')) map.current.setLayoutProperty('heat-fill', 'visibility', absoluteVisibility);
    if (map.current.getLayer('heat-line')) map.current.setLayoutProperty('heat-line', 'visibility', absoluteVisibility);
    
    if (map.current.getLayer('anomaly-fill')) map.current.setLayoutProperty('anomaly-fill', 'visibility', anomalyVisibility);
    if (map.current.getLayer('anomaly-line')) map.current.setLayoutProperty('anomaly-line', 'visibility', anomalyVisibility);

  }, [mode, loaded]);

  // Handle Live Threshold Filtering
  useEffect(() => {
    if (!loaded || !map.current) return;

    const filterHeat: maplibregl.FilterSpecification = ['>=', ['get', 'temp'], threshold];
    const filterAnomaly: maplibregl.FilterSpecification = ['>=', ['get', 'anomaly'], threshold];
    
    // Apply filter to all layers (hidden ones won't show anyway, but state should be consistent)
    if (map.current.getLayer('heat-fill')) map.current.setFilter('heat-fill', filterHeat);
    if (map.current.getLayer('heat-line')) map.current.setFilter('heat-line', filterHeat);
    
    if (map.current.getLayer('anomaly-fill')) map.current.setFilter('anomaly-fill', filterAnomaly);
    if (map.current.getLayer('anomaly-line')) map.current.setFilter('anomaly-line', filterAnomaly);

  }, [threshold, loaded]);

  return (
    <div ref={mapContainer} className="map-container" />
  );
}