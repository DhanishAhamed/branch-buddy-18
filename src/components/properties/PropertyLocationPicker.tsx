import { useState, useEffect, useRef, useCallback } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { OlaMaps } from "olamaps-web-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Loader2 } from "lucide-react";
import { OLA_MAPS_API_KEY, OLA_MAPS_AUTOCOMPLETE_URL } from "@/lib/ola-maps-config";
import { getOlaSanitizedStyle, revokeOlaSanitizedStyleUrl } from "@/lib/ola-maps-style";

interface PropertyLocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (location: { lat: number; lng: number } | null) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function PropertyLocationPicker({ value, onChange }: PropertyLocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(value ? [value.lat, value.lng] : null);
  const [center, setCenter] = useState<[number, number]>([11.2588, 75.7804]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const olaMapsRef = useRef<OlaMaps | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Ola Maps
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let styleUrl: string | null = null;

    const initMap = async () => {
      try {
        console.log("[PropertyLocationPicker] Initializing map...");
        const olaMaps = new OlaMaps({
          apiKey: OLA_MAPS_API_KEY,
        });
        olaMapsRef.current = olaMaps;

        styleUrl = await getOlaSanitizedStyle();

        const map = await olaMaps.init({
          style: styleUrl,
          container: mapContainerRef.current!,
          center: [center[1], center[0]], // Ola Maps uses [lng, lat]
          zoom: 14,
        });

        mapRef.current = map;
        console.log("[PropertyLocationPicker] Map instance created");

        // Handle map clicks
        map.on("click", (e: any) => {
          const newPos: [number, number] = [e.lngLat.lat, e.lngLat.lng];
          setPosition(newPos);
          updateMarker(newPos);
        });

        map.on("load", () => {
          console.log("[PropertyLocationPicker] Map loaded");
          setMapLoaded(true);
          // Trigger resize after load
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.resize();
            }
          }, 100);
        });

        map.on("error", (e: any) => {
          console.error("[PropertyLocationPicker] Map error:", e);
        });
      } catch (err) {
        console.error("[PropertyLocationPicker] Initialization error:", err);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        olaMapsRef.current = null;
      }
      setMapLoaded(false);

      revokeOlaSanitizedStyleUrl(styleUrl);
    };
  }, []);

  // Update marker
  const updateMarker = useCallback((pos: [number, number]) => {
    if (!mapRef.current || !olaMapsRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Add new marker
    markerRef.current = olaMapsRef.current
      .addMarker({ color: "#22C55E", draggable: true })
      .setLngLat([pos[1], pos[0]])
      .addTo(mapRef.current);

    // Handle marker drag
    markerRef.current.on("dragend", () => {
      const lngLat = markerRef.current.getLngLat();
      const newPos: [number, number] = [lngLat.lat, lngLat.lng];
      setPosition(newPos);
    });
  }, []);

  // Add marker after map loads if we have a position
  useEffect(() => {
    if (mapLoaded && position) {
      updateMarker(position);
    }
  }, [mapLoaded, position, updateMarker]);

  // Effect to fly to new center
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.flyTo({
        center: [center[1], center[0]],
        zoom: 14,
        duration: 1000,
      });
    }
  }, [center, mapLoaded]);

  useEffect(() => {
    if (position) {
      onChange({ lat: position[0], lng: position[1] });
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

  const searchPlace = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `${OLA_MAPS_AUTOCOMPLETE_URL}?input=${encodeURIComponent(searchQuery)}&api_key=${OLA_MAPS_API_KEY}`,
        {
          headers: {
            "X-Request-Id": crypto.randomUUID(),
          },
        },
      );
      const data = await response.json();

      if (data.predictions) {
        const mappedResults: SearchResult[] = data.predictions.map((prediction: any) => ({
          display_name: prediction.description || prediction.structured_formatting?.main_text || "",
          lat: String(prediction.geometry?.location?.lat || 0),
          lon: String(prediction.geometry?.location?.lng || 0),
        }));
        setSearchResults(mappedResults);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error("Search error:", error);
    }
    setIsSearching(false);
  };

  const selectPlace = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setCenter([lat, lng]);
    const newPos: [number, number] = [lat, lng];
    setPosition(newPos);
    updateMarker(newPos);
    setSearchQuery(result.display_name);
    setShowResults(false);
  };

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
                  <span className="line-clamp-2">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Click on the map to set location or search for a place</p>

      <div className="h-[200px] rounded-lg overflow-hidden border border-border">
        <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
      </div>

      {position && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <span>
            Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPosition(null);
              onChange(null);
              if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
              }
            }}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
