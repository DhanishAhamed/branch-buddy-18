 import { useEffect, useRef, useState } from 'react';
 import { OlaMaps } from 'olamaps-web-sdk';
 import { OLA_MAPS_API_KEY, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/ola-maps-config';
 
 interface OlaMapContainerProps {
   center?: [number, number]; // [lng, lat]
   zoom?: number;
   onMapReady?: (map: any, olaMaps: OlaMaps) => void;
   onMapClick?: (lngLat: { lng: number; lat: number }) => void;
   className?: string;
 }
 
 export function OlaMapContainer({
   center = DEFAULT_CENTER,
   zoom = DEFAULT_ZOOM,
   onMapReady,
   onMapClick,
   className = 'w-full h-full',
 }: OlaMapContainerProps) {
   const mapContainerRef = useRef<HTMLDivElement>(null);
   const mapRef = useRef<any>(null);
   const olaMapsRef = useRef<OlaMaps | null>(null);
   const [isLoaded, setIsLoaded] = useState(false);
 
   useEffect(() => {
     if (!mapContainerRef.current || mapRef.current) return;
 
     const initMap = async () => {
       const olaMaps = new OlaMaps({
         apiKey: OLA_MAPS_API_KEY,
       });
       olaMapsRef.current = olaMaps;
 
       const map = await olaMaps.init({
         container: mapContainerRef.current!,
         center: center,
         zoom: zoom,
       });
 
       mapRef.current = map;
 
       map.on('load', () => {
         setIsLoaded(true);
         if (onMapReady) {
           onMapReady(map, olaMaps);
         }
       });
 
       if (onMapClick) {
         map.on('click', (e: any) => {
           onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
         });
       }
     };
 
     initMap();
 
     return () => {
       if (mapRef.current) {
         mapRef.current.remove();
         mapRef.current = null;
         olaMapsRef.current = null;
       }
     };
   }, []);
 
   // Update center when prop changes
   useEffect(() => {
     if (mapRef.current && isLoaded) {
       mapRef.current.flyTo({
         center: center,
         zoom: zoom,
         duration: 1000,
       });
     }
   }, [center, zoom, isLoaded]);
 
   return <div ref={mapContainerRef} className={className} />;
 }