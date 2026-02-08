import { useState, useCallback, useRef, useEffect } from 'react';

export interface AutocompleteResult {
  description: string;
  place_id: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export function useGoogleAutocomplete() {
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize services when Google Maps is loaded
  useEffect(() => {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      // PlacesService requires a map or div element
      const div = document.createElement('div');
      placesServiceRef.current = new google.maps.places.PlacesService(div);
    }
  }, []);

  const getPlaceDetails = useCallback((placeId: string): Promise<google.maps.places.PlaceResult | null> => {
    return new Promise((resolve) => {
      if (!placesServiceRef.current) {
        resolve(null);
        return;
      }

      placesServiceRef.current.getDetails(
        { placeId, fields: ['geometry'] },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            resolve(result);
          } else {
            resolve(null);
          }
        }
      );
    });
  }, []);

  const search = useCallback(async (query: string, location?: { lat: number; lng: number }) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (!autocompleteServiceRef.current) {
      // Try to initialize if not ready
      if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        const div = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(div);
      } else {
        console.warn('Google Maps Places API not loaded yet');
        return;
      }
    }

    setIsSearching(true);

    const request: google.maps.places.AutocompletionRequest = {
      input: query,
      componentRestrictions: { country: 'in' }, // Restrict to India
    };

    if (location) {
      request.location = new google.maps.LatLng(location.lat, location.lng);
      request.radius = 50000; // 50km bias radius
    }

    autocompleteServiceRef.current.getPlacePredictions(
      request,
      async (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          // Get details for each prediction to get coordinates
          const resultsWithGeometry: AutocompleteResult[] = await Promise.all(
            predictions.slice(0, 5).map(async (prediction) => {
              const details = await getPlaceDetails(prediction.place_id);
              return {
                description: prediction.description,
                place_id: prediction.place_id,
                geometry: details?.geometry?.location
                  ? {
                      location: {
                        lat: details.geometry.location.lat(),
                        lng: details.geometry.location.lng(),
                      },
                    }
                  : undefined,
              };
            })
          );
          setResults(resultsWithGeometry);
        } else {
          setResults([]);
        }
        setIsSearching(false);
      }
    );
  }, [getPlaceDetails]);

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
