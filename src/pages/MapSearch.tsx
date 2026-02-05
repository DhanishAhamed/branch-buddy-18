import { useState, useEffect, useRef, useCallback } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { OlaMaps } from "olamaps-web-sdk";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation, Phone, Search, MapPin, Loader2, Bed, Bath, Maximize, Building2 } from "lucide-react";
import { OLA_MAPS_API_KEY, OLA_MAPS_AUTOCOMPLETE_URL } from "@/lib/ola-maps-config";
import { getOlaStyle } from "@/lib/ola-maps-style";

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
  display_name: string;
  lat: string;
  lon: string;
}

export default function MapSearch() {
  const [center, setCenter] = useState<[number, number]>([11.2588, 75.7804]); // Calicut
  const [radius, setRadius] = useState([50]); // km - default to larger radius to show more properties
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const centerMarkerRef = useRef<any>(null);
  const circleLayerRef = useRef<any>(null);
  const olaMapsRef = useRef<OlaMaps | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { profile } = useAuth();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Ola Maps
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initMap = async () => {
      try {
        console.log("[MapSearch] Initializing map...");
        const olaMaps = new OlaMaps({
          apiKey: OLA_MAPS_API_KEY,
        });
        olaMapsRef.current = olaMaps;

         const style = await getOlaStyle();
         console.log("[MapSearch] Using sanitized style object");

        const map = await olaMaps.init({
          style,
          container: mapContainerRef.current!,
          center: [center[1], center[0]], // Ola Maps uses [lng, lat]
          zoom: 12,
        });

        mapRef.current = map;
        console.log("[MapSearch] Map instance created");

        map.on("load", () => {
          console.log("[MapSearch] Map loaded");
          setMapLoaded(true);
          // Trigger resize to ensure proper rendering
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.resize();
            }
          }, 100);
        });

        map.on("error", (e: any) => {
          console.error("[MapSearch] Map error:", e);
        });
      } catch (err) {
        console.error("[MapSearch] Initialization error:", err);
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
    };
  }, []);

  // Update center marker when center changes
  const updateCenterMarker = useCallback(() => {
    if (!mapRef.current || !olaMapsRef.current) return;

    // Remove existing center marker
    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
    }

    // Add new center marker
    centerMarkerRef.current = olaMapsRef.current
      .addMarker({ color: "#22C55E", draggable: false })
      .setLngLat([center[1], center[0]])
      .addTo(mapRef.current);
  }, [center]);

  // Update radius circle
  const updateRadiusCircle = useCallback(() => {
    if (!mapRef.current) return;

    // Remove existing circle layer
    if (circleLayerRef.current) {
      if (mapRef.current.getLayer("radius-circle")) {
        mapRef.current.removeLayer("radius-circle");
      }
      if (mapRef.current.getSource("radius-circle")) {
        mapRef.current.removeSource("radius-circle");
      }
    }

    // Create circle as GeoJSON
    const radiusInMeters = radius[0] * 1000;
    const points = 64;
    const coords = [];

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radiusInMeters * Math.cos(angle);
      const dy = radiusInMeters * Math.sin(angle);
      const lat = center[0] + dy / 111320;
      const lng = center[1] + dx / (111320 * Math.cos((center[0] * Math.PI) / 180));
      coords.push([lng, lat]);
    }
    coords.push(coords[0]); // Close the circle

    try {
      mapRef.current.addSource("radius-circle", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [coords],
          },
        },
      });

      mapRef.current.addLayer({
        id: "radius-circle",
        type: "fill",
        source: "radius-circle",
        paint: {
          "fill-color": "#22C55E",
          "fill-opacity": 0.1,
        },
      });

      circleLayerRef.current = true;
    } catch (error) {
      console.error("Error adding circle layer:", error);
    }
  }, [center, radius]);

  // Update property markers
  const updatePropertyMarkers = useCallback(() => {
    if (!mapRef.current || !olaMapsRef.current) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    filteredProperties.forEach((property) => {
      const popup = olaMapsRef.current!.addPopup({ offset: [0, -30], closeOnClick: true }).setHTML(`
           <div style="padding: 8px; min-width: 150px;">
             <h3 style="font-weight: 600; font-size: 14px; margin: 0;">${property.title}</h3>
             ${property.price ? `<p style="color: #22C55E; font-weight: 700; font-size: 14px; margin: 4px 0 0 0;">${formatPrice(property.price)}</p>` : ""}
           </div>
         `);

      const marker = olaMapsRef
        .current!.addMarker({ color: "#3B82F6", draggable: false })
        .setLngLat([property.lng, property.lat])
        .setPopup(popup)
        .addTo(mapRef.current);

      marker.getElement().addEventListener("click", () => {
        setSelectedProperty(property);
      });

      markersRef.current.push(marker);
    });
  }, [filteredProperties]);

  // Effect to update map when center changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.flyTo({
        center: [center[1], center[0]],
        zoom: 12,
        duration: 1000,
      });
      updateCenterMarker();
      updateRadiusCircle();
    }
  }, [center, mapLoaded, updateCenterMarker, updateRadiusCircle]);

  // Effect to update circle when radius changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      updateRadiusCircle();
    }
  }, [radius, mapLoaded, updateRadiusCircle]);

  // Effect to update property markers
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      updatePropertyMarkers();
    }
  }, [filteredProperties, mapLoaded, updatePropertyMarkers]);

  useEffect(() => {
    fetchPropertyTypes();
    fetchAllProperties();
  }, []);

  // Filter properties whenever center, radius, type, or price changes
  useEffect(() => {
    filterProperties();
  }, [center, radius, selectedType, priceRange, allProperties, hasSearched]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPropertyTypes = async () => {
    const { data } = await supabase.from("property_types").select("id, name");
    if (data) setPropertyTypes(data);
  };

  const fetchAllProperties = async () => {
    // Use RPC to get properties with coordinates
    const { data, error } = await (supabase.rpc as any)("get_properties_with_coords");

    if (error) {
      console.error("Error fetching properties:", error);
      // Fallback: try regular query
      const { data: fallbackData } = await supabase
        .from("properties")
        .select("id, title, address, price, property_type_id, bedrooms, bathrooms, area_sqft, images, location")
        .eq("status", "available");

      if (fallbackData) {
        const props: Property[] = [];
        for (const p of fallbackData) {
          if (!p.location) continue;
          const locStr = String(p.location);
          // Try to parse as WKT
          const match = locStr.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (match) {
            props.push({
              id: p.id,
              title: p.title,
              address: p.address,
              price: p.price,
              property_type_id: p.property_type_id,
              bedrooms: p.bedrooms,
              bathrooms: p.bathrooms,
              area_sqft: p.area_sqft,
              images: p.images,
              lat: parseFloat(match[2]),
              lng: parseFloat(match[1]),
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
          id: p.id,
          title: p.title,
          address: p.address,
          price: p.price,
          property_type_id: p.property_type_id,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          area_sqft: p.area_sqft,
          images: p.images,
          lat: p.lat,
          lng: p.lng,
        }));
      setAllProperties(props);
    }
  };

  const filterProperties = () => {
    let filtered = [...allProperties];

    // Filter by property type
    if (selectedType !== "all") {
      filtered = filtered.filter((p) => p.property_type_id === selectedType);
    }

    // Filter by price range
    if (priceRange !== "all") {
      const [min, max] = priceRange.split("-").map(Number);
      filtered = filtered.filter((p) => {
        if (!p.price) return false;
        if (min && p.price < min) return false;
        if (max && p.price > max) return false;
        return true;
      });
    }

    // Filter by radius only if user has searched for a location
    if (hasSearched) {
      filtered = filtered.filter((p) => {
        const dist = haversineDistance(center[0], center[1], p.lat, p.lng);
        return dist <= radius[0];
      });
    }

    setFilteredProperties(filtered);
  };

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const searchPlace = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `${OLA_MAPS_AUTOCOMPLETE_URL}?input=${encodeURIComponent(query)}&api_key=${OLA_MAPS_API_KEY}`,
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
      setSearchResults([]);
      setShowResults(false);
    }
    setIsSearching(false);
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchPlace(value);
    }, 300);
  };

  const selectPlace = (result: SearchResult) => {
    setCenter([parseFloat(result.lat), parseFloat(result.lon)]);
    setSearchQuery(result.display_name.split(",")[0]);
    setShowResults(false);
    setHasSearched(true);
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
    <div className="flex flex-col md:flex-row h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem)] min-h-0">
      {/* Left Side - Map & Filters */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col h-full min-h-0">
        {/* Filters */}
        <Card className="m-4 mb-0 border-border relative z-[1000]">
          <CardContent className="p-4 space-y-4">
            {/* Place Search */}
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a place..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results Dropdown */}
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
                        <span className="line-clamp-2">{result.display_name}</span>
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

            <div className="flex gap-3">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="flex-1">
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
        <div className="flex-1 m-4 rounded-xl overflow-hidden border border-border min-h-0">
          <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
        </div>

        <p className="text-center text-sm text-muted-foreground pb-4">
          <span className="font-semibold text-primary">{filteredProperties.length}</span> properties found
        </p>
      </div>

      {/* Right Side - Property Cards */}
      <div className="w-full md:w-1/2 lg:w-3/5 h-full min-h-0 overflow-y-auto border-l border-border bg-muted/30">
        <div className="p-4 space-y-4">
          <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
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
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredProperties.map((property) => (
                <Card
                  key={property.id}
                  className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                    selectedProperty?.id === property.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedProperty(property)}
                >
                  {/* Image */}
                  <div className="h-32 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center overflow-hidden">
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
                        {property.bedrooms && (
                          <span className="flex items-center gap-1">
                            <Bed className="h-3 w-3" />
                            {property.bedrooms}
                          </span>
                        )}
                        {property.bathrooms && (
                          <span className="flex items-center gap-1">
                            <Bath className="h-3 w-3" />
                            {property.bathrooms}
                          </span>
                        )}
                        {property.area_sqft && (
                          <span className="flex items-center gap-1">
                            <Maximize className="h-3 w-3" />
                            {property.area_sqft}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      {property.price && <span className="font-bold text-primary">{formatPrice(property.price)}</span>}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDirections(property.lat, property.lng);
                        }}
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
