import { useState, useEffect, useRef, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Loader2 } from "lucide-react";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, DEFAULT_CENTER } from "@/lib/google-maps-config";

interface PropertyLocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (location: { lat: number; lng: number } | null) => void;
}

interface SearchResult {
  description: string;
  place_id: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

const containerStyle = {
  width: "100%",
  height: "100%",
};

export function PropertyLocationPicker({ value, onChange }: PropertyLocationPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(value);
  const [center, setCenter] = useState<{ lat: number; lng: number }>(value || DEFAULT_CENTER);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    placesServiceRef.current = new google.maps.places.PlacesService(map);
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPosition(newPos);
    }
  }, []);

  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPosition(newPos);
    }
  }, []);

  useEffect(() => {
    if (position) {
      onChange(position);
    }
  }, [position, onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pan to new center
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo(center);
    }
  }, [center]);

  const getPlaceDetails = useCallback((placeId: string): Promise<google.maps.places.PlaceResult | null> => {
    return new Promise((resolve) => {
      if (!placesServiceRef.current) {
        resolve(null);
        return;
      }

      placesServiceRef.current.getDetails(
        { placeId, fields: ["geometry"] },
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

  const searchPlace = async () => {
    if (!searchQuery.trim()) return;
    if (!autocompleteServiceRef.current) return;

    setIsSearching(true);

    const request: google.maps.places.AutocompletionRequest = {
      input: searchQuery,
      componentRestrictions: { country: "in" },
    };

    autocompleteServiceRef.current.getPlacePredictions(request, async (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        const resultsWithGeometry: SearchResult[] = await Promise.all(
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
        setSearchResults(resultsWithGeometry);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
      setIsSearching(false);
    });
  };

  const selectPlace = (result: SearchResult) => {
    if (result.geometry?.location) {
      const newPos = result.geometry.location;
      setCenter(newPos);
      setPosition(newPos);
    }
    setSearchQuery(result.description);
    setShowResults(false);
  };

  if (loadError) {
    return (
      <div className="space-y-3">
        <Label>Map Location</Label>
        <div className="h-[200px] rounded-lg overflow-hidden border border-border flex items-center justify-center bg-muted/50">
          <p className="text-sm text-destructive">Failed to load map</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="space-y-3">
        <Label>Map Location</Label>
        <div className="h-[200px] rounded-lg overflow-hidden border border-border flex items-center justify-center bg-muted/50">
          <div className="animate-pulse text-muted-foreground">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Map Location</Label>

      {/* Place Search */}
      <div ref={searchRef} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for a place..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchPlace()}
              className="pl-10"
            />
          </div>
          <Button type="button" variant="outline" onClick={searchPlace} disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted/50 text-sm border-b border-border last:border-b-0"
                onClick={() => selectPlace(result)}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{result.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Click on the map to set location or search for a place</p>

      <div className="h-[200px] rounded-lg overflow-hidden border border-border">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={14}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          onClick={onMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {position && (
            <Marker
              position={position}
              draggable
              onDragEnd={onMarkerDragEnd}
            />
          )}
        </GoogleMap>
      </div>

      {position && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <span>
            Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPosition(null);
              onChange(null);
            }}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
