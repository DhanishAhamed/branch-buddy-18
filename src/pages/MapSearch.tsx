import { useState, useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import * as turf from "@turf/turf";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation, Search, MapPin, Loader2, Bed, Bath, Maximize, Building2 } from "lucide-react";
import { OLA_MAPS_API_KEY, OLA_STYLE_URL, OLA_AUTOCOMPLETE_URL, DEFAULT_CENTER } from "@/lib/ola-maps-config";

interface Property {
  id: string;
  title: string;
  address: string | null;
  price: number | null;
  property_type_id: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  images: string[] | null;
  lat: number;
  lng: number;
}

interface PropertyType {
  id: string;
  name: string;
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

export default function MapSearch() {
  const [center, setCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [radius, setRadius] = useState([50]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const centerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { profile } = useAuth();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: OLA_STYLE_URL,
        center: [center.lng, center.lat],
        zoom: 12,
        transformRequest: (url) => {
          if (url.includes("api.olamaps.io")) {
            const separator = url.includes("?") ? "&" : "?";
            return { url: `${url}${separator}api_key=${OLA_MAPS_API_KEY}` };
          }
          return { url };
        },
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        setMapLoading(false);
        mapRef.current = map;

        // Add radius circle source and layers
        map.addSource("radius-circle", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "radius-fill",
          type: "fill",
          source: "radius-circle",
          paint: {
            "fill-color": "#22C55E",
            "fill-opacity": 0.1,
          },
        });

        map.addLayer({
          id: "radius-line",
          type: "line",
          source: "radius-circle",
          paint: {
            "line-color": "#22C55E",
            "line-width": 2,
            "line-opacity": 0.8,
          },
        });
      });

      map.on("error", (e) => {
        // Ignore non-fatal style layer errors (e.g. missing 3d_model source layer)
        console.warn("Map error (non-fatal):", e);
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error("Map init error:", err);
      setMapLoading(false);
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchPropertyTypes();
    fetchAllProperties();
  }, []);

  // Filter when deps change
  useEffect(() => {
    filterProperties();
  }, [center, radius, selectedType, priceRange, allProperties, hasSearched]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update map center
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [center.lng, center.lat], duration: 800 });
    }
  }, [center]);

  // Update radius circle on map
  useEffect(() => {
    if (!mapRef.current || !hasSearched) return;
    const source = mapRef.current.getSource("radius-circle") as maplibregl.GeoJSONSource;
    if (source) {
      const circleGeoJSON = turf.circle([center.lng, center.lat], radius[0], { units: "kilometers" });
      source.setData(circleGeoJSON);
    }
  }, [center, radius, hasSearched]);

  // Update center marker
  useEffect(() => {
    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }
    if (hasSearched && mapRef.current) {
      const el = document.createElement("div");
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#22C55E";
      el.style.border = "3px solid #ffffff";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      centerMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([center.lng, center.lat])
        .addTo(mapRef.current);
    }
  }, [center, hasSearched]);

  // Update property markers
  useEffect(() => {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!mapRef.current) return;

    filteredProperties.forEach((property) => {
      const el = document.createElement("div");
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = selectedProperty?.id === property.id ? "#22C55E" : "#3B82F6";
      el.style.border = "2px solid #ffffff";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([property.lng, property.lat])
        .addTo(mapRef.current!);

      el.addEventListener("click", () => {
        if (popupRef.current) popupRef.current.remove();

        const priceStr = property.price ? formatPrice(property.price) : "";
        const html = `<div style="padding:4px;min-width:120px"><strong style="font-size:13px">${property.title}</strong>${priceStr ? `<p style="color:#22C55E;font-weight:bold;font-size:13px;margin-top:4px">${priceStr}</p>` : ""}</div>`;

        popupRef.current = new maplibregl.Popup({ offset: 25, closeButton: true })
          .setLngLat([property.lng, property.lat])
          .setHTML(html)
          .addTo(mapRef.current!);
      });

      markersRef.current.push(marker);
    });
  }, [filteredProperties, selectedProperty]);

  const fetchPropertyTypes = async () => {
    const { data } = await supabase.from("property_types").select("id, name");
    if (data) setPropertyTypes(data);
  };

  const fetchAllProperties = async () => {
    const { data, error } = await (supabase.rpc as any)("get_properties_with_coords");

    if (error) {
      console.error("Error fetching properties:", error);
      const { data: fallbackData } = await supabase
        .from("properties")
        .select("id, title, address, price, property_type_id, bedrooms, bathrooms, area_sqft, images, location")
        .eq("status", "available");

      if (fallbackData) {
        const props: Property[] = [];
        for (const p of fallbackData) {
          if (!p.location) continue;
          const locStr = String(p.location);
          const match = locStr.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (match) {
            props.push({
              id: p.id, title: p.title, address: p.address, price: p.price,
              property_type_id: p.property_type_id, bedrooms: p.bedrooms,
              bathrooms: p.bathrooms, area_sqft: p.area_sqft, images: p.images,
              lat: parseFloat(match[2]), lng: parseFloat(match[1]),
            });
          }
        }
        setAllProperties(props);
      }
      return;
    }

    if (data && Array.isArray(data)) {
      const props: Property[] = data
        .filter((p: any) => p.lat !== null && p.lng !== null)
        .map((p: any) => ({
          id: p.id, title: p.title, address: p.address, price: p.price,
          property_type_id: p.property_type_id, bedrooms: p.bedrooms,
          bathrooms: p.bathrooms, area_sqft: p.area_sqft, images: p.images,
          lat: p.lat, lng: p.lng,
        }));
      setAllProperties(props);
    }
  };

  const filterProperties = () => {
    let filtered = [...allProperties];
    if (selectedType !== "all") filtered = filtered.filter((p) => p.property_type_id === selectedType);
    if (priceRange !== "all") {
      const [min, max] = priceRange.split("-").map(Number);
      filtered = filtered.filter((p) => {
        if (!p.price) return false;
        if (min && p.price < min) return false;
        if (max && p.price > max) return false;
        return true;
      });
    }
    if (hasSearched) {
      filtered = filtered.filter((p) => {
        const dist = haversineDistance(center.lat, center.lng, p.lat, p.lng);
        return dist <= radius[0];
      });
    }
    setFilteredProperties(filtered);
  };

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Ola Maps Autocomplete via REST
  const searchPlace = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `${OLA_AUTOCOMPLETE_URL}?input=${encodeURIComponent(query)}&api_key=${OLA_MAPS_API_KEY}&location=${center.lat},${center.lng}`
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
  }, [center]);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlace(value), 300);
  };

  const selectPlace = (result: SearchResult) => {
    if (result.geometry?.location) {
      setCenter(result.geometry.location);
      setHasSearched(true);
    }
    setSearchQuery(result.description.split(",")[0]);
    setShowResults(false);
  };

  const openDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
    return `₹${(price / 1000).toFixed(0)}K`;
  };


  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-3.5rem)] min-h-0 overflow-x-hidden w-full max-w-[100vw]">
      {/* Left Side - Map & Filters */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col min-h-0 md:h-full overflow-x-hidden">
        {/* Filters */}
        <Card className="mx-3 md:mx-4 mt-3 md:mt-4 mb-0 border-border relative z-[1000] rounded-xl">
          <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
            {/* Place Search */}
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a place..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  className="pl-10 h-11 md:h-10 text-base md:text-sm"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {showResults && searchResults.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      className="w-full px-4 py-3 text-left hover:bg-muted/50 text-sm border-b border-border last:border-b-0"
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

            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                Radius: <span className="text-primary font-semibold">{radius[0]} km</span>
              </label>
              <Slider value={radius} onValueChange={setRadius} min={1} max={50} step={1} className="w-full" />
            </div>

            <div className="flex gap-2 md:gap-3">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="flex-1 h-10">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="flex-1 h-10">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Price</SelectItem>
                  <SelectItem value="0-5000000">Under ₹50L</SelectItem>
                  <SelectItem value="5000000-10000000">₹50L - ₹1Cr</SelectItem>
                  <SelectItem value="10000000-50000000">₹1Cr - ₹5Cr</SelectItem>
                  <SelectItem value="50000000-">Above ₹5Cr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <div
          className="mx-3 md:mx-4 mt-3 md:mt-4 rounded-xl overflow-hidden border border-border relative md:flex-1"
          style={{ minHeight: '300px' }}
        >
          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
              <div className="animate-pulse text-muted-foreground">Loading map...</div>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-[300px] md:h-full min-h-[300px] block relative [&_.maplibregl-ctrl-top-right]:!right-3 [&_.maplibregl-ctrl-top-right]:!top-3" />
        </div>

        <p className="text-center text-sm text-muted-foreground py-3 md:pb-4">
          <span className="font-semibold text-primary">{filteredProperties.length}</span> properties found
        </p>
      </div>

      {/* Right Side - Property Cards */}
      {/* Right Side - Property Cards */}
      <div className="w-full md:w-1/2 lg:w-3/5 min-h-0 overflow-y-auto border-t md:border-t-0 md:border-l border-border bg-muted/30 md:h-full">
        <div className="px-3 md:px-4 pb-20 md:pb-4 space-y-3 md:space-y-4">
          <h2 className="font-bold text-base md:text-lg text-foreground flex items-center gap-2 pt-4 md:pt-4">
            <Building2 className="h-5 w-5 text-primary" />
            Properties in Area
          </h2>

          {filteredProperties.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-center">
                  No properties found in this area.
                  <br />
                  Try expanding the search radius or changing filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
              {filteredProperties.map((property) => (
                <Card
                  key={property.id}
                  className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer border-border shadow-sm ${
                    selectedProperty?.id === property.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedProperty(property)}
                >
                  <div className="h-36 md:h-32 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center overflow-hidden">
                    {property.images?.[0] ? (
                      <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="h-10 w-10 text-muted-foreground/30" />
                    )}
                  </div>

                  <CardContent className="p-3 space-y-2">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1">{property.title}</h3>
                    {property.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-1">{property.address}</span>
                      </p>
                    )}
                    {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {property.bedrooms && <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{property.bedrooms}</span>}
                        {property.bathrooms && <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{property.bathrooms}</span>}
                        {property.area_sqft && <span className="flex items-center gap-1"><Maximize className="h-3 w-3" />{property.area_sqft}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      {property.price && <span className="font-bold text-primary">{formatPrice(property.price)}</span>}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); openDirections(property.lat, property.lng); }}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Directions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
