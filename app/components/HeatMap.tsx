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

  // Generate dummy heat data (Hexagonal-ish grid)
  const generateHeatData = () => {
    const centers = [
      [-0.1276, 51.5074], // London
      [139.6917, 35.6895], // Tokyo
      [-112.0740, 33.4484], // Phoenix
      [2.3522, 48.8566]   // Paris
    ];
    
    const features: any[] = [];
    const size = 0.005; // roughly 500m
    const rows = 20;
    const cols = 20;

    centers.forEach(([cx, cy]) => {
      for (let i = -rows; i < rows; i++) {
        for (let j = -cols; j < cols; j++) {
          // Offset for hex-like staggering
          const xOffset = (j % 2 === 0) ? 0 : size / 2;
          const x = cx + i * size + xOffset;
          const y = cy + j * size * 0.866;
          
          // Random temperature 0-100, biased towards center being hotter
          const dist = Math.sqrt(i*i + j*j);
          let temp = Math.random() * 100;
          // Make center hotter
          if (dist < 5) temp += 20;
          if (dist > 15) temp -= 20;
          temp = Math.max(0, Math.min(100, temp));

          // Create a simple square polygon for performance (visual style handles the look)
          const poly = [
              [x, y],
              [x + size, y],
              [x + size, y + size],
              [x, y + size],
              [x, y]
          ];

          features.push({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [poly]
            },
            properties: {
              temp: temp
            }
          });
        }
      }
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  };

  useEffect(() => {
    if (map.current) return;

    // Register PMTiles protocol (placeholder for future real data)
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-0.1276, 51.5074], // London
      zoom: 11,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    map.current.on('load', () => {
      setLoaded(true);
      if (onMapLoad && map.current) onMapLoad(map.current);

      // Add Dummy Source
      map.current!.addSource('heat-source', {
        type: 'geojson',
        data: generateHeatData() as any
      });

      // Add Heat Layer (Polygons)
      map.current!.addLayer({
        id: 'heat-fill',
        type: 'fill',
        source: 'heat-source',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'temp'],
            0, '#3b82f6',   // Blue (Cool)
            50, '#f97316',  // Orange (Warm)
            80, '#ef4444',  // Red (Hot)
            100, '#b91c1c'  // Deep Red (Burning)
          ],
          'fill-opacity': 0.6
        }
      });

      // Add Glowing Border
      map.current!.addLayer({
        id: 'heat-line',
        type: 'line',
        source: 'heat-source',
        paint: {
          'line-color': [
            'interpolate',
            ['linear'],
            ['get', 'temp'],
            0, '#60a5fa',
            50, '#fb923c',
            80, '#f87171',
            100, '#dc2626'
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
