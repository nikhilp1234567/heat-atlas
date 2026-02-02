'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

interface HeatMapProps {
  threshold: number;
  onMapLoad?: (map: maplibregl.Map) => void;
}

export default function HeatMap({ threshold, onMapLoad }: HeatMapProps) {
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
      // attributionControl defaults to true, which is what we want
    });

    map.current.on('load', () => {
      setLoaded(true);
      if (onMapLoad && map.current) onMapLoad(map.current);

      // Real Data Source via PMTiles
      // TODO: Replace with your Vercel Blob URL
      const PMTILES_URL = 'https://b2xyufgbf31bjxw5.public.blob.vercel-storage.com/planet_heat.pmtiles'; 

      map.current!.addSource('heat-source', {
        type: 'vector',
        url: `pmtiles://${PMTILES_URL}`,
        attribution: '© OpenStreetMap contributors, © CartoDB'
      });

      // Add Heat Layer (Polygons)
      map.current!.addLayer({
        id: 'heat-fill',
        type: 'fill',
        source: 'heat-source',
        'source-layer': 'heat_layer', // Adjust this to match your PMTiles internal layer name
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'temp'], // Ensure your vector tiles have a 'temp' property
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

      // Add Glowing Border
      map.current!.addLayer({
        id: 'heat-line',
        type: 'line',
        source: 'heat-source',
        'source-layer': 'heat_layer',
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
    });

  }, [onMapLoad]);

  // Handle Live Threshold Filtering
  useEffect(() => {
    if (!loaded || !map.current) return;

    const filter = ['>=', ['get', 'temp'], threshold];
    
    if (map.current.getLayer('heat-fill')) {
      map.current.setFilter('heat-fill', filter as any);
    }
    if (map.current.getLayer('heat-line')) {
      map.current.setFilter('heat-line', filter as any);
    }

  }, [threshold, loaded]);

  return (
    <div ref={mapContainer} className="map-container" />
  );
}
