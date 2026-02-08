import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useState } from 'react';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/google-maps-config';

interface GoogleMapContainerProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

export function GoogleMapContainer({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapReady,
  onMapClick,
  className = 'w-full h-full',
  children,
}: GoogleMapContainerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    if (onMapReady) {
      onMapReady(mapInstance);
    }
  }, [onMapReady]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/50 text-destructive`}>
        <div className="text-center p-4">
          <p className="font-medium">Map failed to load</p>
          <p className="text-sm text-muted-foreground mt-1">
            {loadError.message || 'Please check your API key configuration'}
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/50`}>
        <div className="animate-pulse text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <div className={className} style={{ minHeight: '200px' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {children}
      </GoogleMap>
    </div>
  );
}
