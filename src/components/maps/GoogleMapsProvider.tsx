import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps-config';
import { ReactNode } from 'react';

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={GOOGLE_MAPS_LIBRARIES}
      loadingElement={
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">Loading Google Maps...</div>
        </div>
      }
    >
      {children}
    </LoadScript>
  );
}
