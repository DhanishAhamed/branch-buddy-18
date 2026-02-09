import { useState, useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Loader2 } from "lucide-react";
import { OLA_MAPS_API_KEY, OLA_STYLE_URL, OLA_AUTOCOMPLETE_URL, DEFAULT_CENTER } from "@/lib/ola-maps-config";

interface PropertyLocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (location: { lat: number; lng: number } | null) => void;
}

interface SearchResult {
  description: string;
  place_id: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
}

export function PropertyLocationPicker({ value, onChange }: PropertyLocationPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(value);
  const [center, setCenter] = useState<{ lat: number; lng: number }>(value || DEFAULT_CENTER);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OLA_STYLE_URL,
      center: [center.lng, center.lat],
      zoom: 14,
      transformRequest: (url) => {
        if (url.includes("api.olamaps.io")) {
          const separator = url.includes("?") ? "&" : "?";
          return { url: `${url}${separator}api_key=${OLA_MAPS_API_KEY}` };
        }
        return { url };
      },
    });

    map.on("load", () => {
      mapRef.current = map;

      // Place initial marker if value exists
      if (value) {
        addMarker(map, value);
      }
    });

    map.on("click", (e) => {
      const newPos = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      setPosition(newPos);
      addMarker(map, newPos);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const addMarker = (map: maplibregl.Map, pos: { lat: number; lng: number }) => {
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new maplibregl.Marker({ draggable: true })
      .setLngLat([pos.lng, pos.lat])
      .addTo(map);

    markerRef.current.on("dragend", () => {
      const lngLat = markerRef.current!.getLngLat();
      setPosition({ lat: lngLat.lat, lng: lngLat.lng });
    });
  };

  // Propagate position changes
  useEffect(() => {
    if (position) onChange(position);
  }, [position, onChange]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pan to center
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [center.lng, center.lat], duration: 600 });
    }
  }, [center]);

  const searchPlace = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `${OLA_AUTOCOMPLETE_URL}?input=${encodeURIComponent(searchQuery)}&api_key=${OLA_MAPS_API_KEY}&location=${center.lat},${center.lng}`
      );
      const json = await res.json();
      if (json.predictions && Array.isArray(json.predictions)) {
        const results: SearchResult[] = json.predictions.slice(0, 5).map((p: any) => ({
          description: p.description || p.structured_formatting?.main_text || "",
          place_id: p.place_id || "",
          geometry: p.geometry?.location
            ? { location: { lat: p.geometry.location.lat, lng: p.geometry.location.lng } }
            : undefined,
        }));
        setSearchResults(results);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (err) {
      console.error("Autocomplete error:", err);
      setSearchResults([]);
      setShowResults(false);
    }
    setIsSearching(false);
  };

  const selectPlace = (result: SearchResult) => {
    if (result.geometry?.location) {
      const newPos = result.geometry.location;
      setCenter(newPos);
      setPosition(newPos);
      if (mapRef.current) addMarker(mapRef.current, newPos);
    }
    setSearchQuery(result.description);
    setShowResults(false);
  };

  return (
    <div className="space-y-3">
      <Label>Map Location</Label>

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
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {position && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <span>Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPosition(null);
              onChange(null);
              if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
            }}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
