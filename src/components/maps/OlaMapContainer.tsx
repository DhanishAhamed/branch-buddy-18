import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { OLA_MAPS_API_KEY, OLA_STYLE_URL, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/ola-maps-config';

interface OlaMapContainerProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapReady?: (map: maplibregl.Map) => void;
  onMapClick?: (lngLat: { lat: number; lng: number }) => void;
  className?: string;
}

export function OlaMapContainer({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapReady,
  onMapClick,
  className = 'w-full h-full',
}: OlaMapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: OLA_STYLE_URL,
        center: [center.lng, center.lat],
        zoom,
        transformRequest: (url, resourceType) => {
          if (url.includes('api.olamaps.io')) {
            const separator = url.includes('?') ? '&' : '?';
            return { url: `${url}${separator}api_key=${OLA_MAPS_API_KEY}` };
          }
          return { url };
        },
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.on('load', () => {
        setLoading(false);
        mapRef.current = map;
        onMapReady?.(map);
      });

      map.on('error', (e) => {
        console.error('Map error:', e);
        setError('Failed to load map tiles');
        setLoading(false);
      });

      if (onMapClick) {
        map.on('click', (e) => {
          onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
      }

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('Map init error:', err);
      setError('Failed to initialize map');
      setLoading(false);
    }
  }, []); // Only init once

  // Update center when prop changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [center.lng, center.lat], duration: 800 });
    }
  }, [center.lat, center.lng]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/50`}>
        <div className="text-center p-4">
          <p className="font-medium text-destructive">Map failed to load</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ position: 'relative', minHeight: '200px' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <div className="animate-pulse text-muted-foreground">Loading map...</div>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
