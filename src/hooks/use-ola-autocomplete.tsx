 import { useState, useCallback, useRef } from 'react';
 import { OLA_MAPS_API_KEY, OLA_MAPS_AUTOCOMPLETE_URL } from '@/lib/ola-maps-config';
 
 export interface AutocompleteResult {
   description: string;
   place_id: string;
   geometry: {
     location: {
       lat: number;
       lng: number;
     };
   };
 }
 
 export function useOlaAutocomplete() {
   const [results, setResults] = useState<AutocompleteResult[]>([]);
   const [isSearching, setIsSearching] = useState(false);
   const debounceRef = useRef<NodeJS.Timeout | null>(null);
 
   const search = useCallback(async (query: string, location?: { lat: number; lng: number }) => {
     if (!query.trim()) {
       setResults([]);
       return;
     }
 
     setIsSearching(true);
     try {
       let url = `${OLA_MAPS_AUTOCOMPLETE_URL}?input=${encodeURIComponent(query)}&api_key=${OLA_MAPS_API_KEY}`;
       
       if (location) {
         url += `&location=${location.lat},${location.lng}`;
       }
 
       const response = await fetch(url, {
         headers: {
           'X-Request-Id': crypto.randomUUID(),
         },
       });
       
       const data = await response.json();
       
       if (data.predictions) {
         const mappedResults: AutocompleteResult[] = data.predictions.map((prediction: any) => ({
           description: prediction.description || prediction.structured_formatting?.main_text || '',
           place_id: prediction.place_id || '',
           geometry: {
             location: {
               lat: prediction.geometry?.location?.lat || 0,
               lng: prediction.geometry?.location?.lng || 0,
             },
           },
         }));
         setResults(mappedResults);
       } else {
         setResults([]);
       }
     } catch (error) {
       console.error('Ola Maps autocomplete error:', error);
       setResults([]);
     }
     setIsSearching(false);
   }, []);
 
   const debouncedSearch = useCallback((query: string, location?: { lat: number; lng: number }) => {
     if (debounceRef.current) {
       clearTimeout(debounceRef.current);
     }
     debounceRef.current = setTimeout(() => {
       search(query, location);
     }, 300);
   }, [search]);
 
   const clearResults = useCallback(() => {
     setResults([]);
   }, []);
 
   return {
     results,
     isSearching,
     search: debouncedSearch,
     clearResults,
   };
 }