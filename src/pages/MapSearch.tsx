import { useState, useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import * as turf from "@turf/turf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, MapPin, Loader2, ChevronDown, LayoutGrid, List, Locate, Map as MapIcon, Layers } from "lucide-react";
import { OLA_MAPS_API_KEY, OLA_STYLE_URL, OLA_AUTOCOMPLETE_URL, DEFAULT_CENTER } from "@/lib/ola-maps-config";
import { createMarkerElement, createClusterElement, formatPrice } from "@/components/maps/PropertyMarker";
import { PropertyDetailModal } from "@/components/properties/PropertyDetailModal";
import { Skeleton } from "@/components/ui/skeleton";

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
  status?: string;
  description?: string | null;
}

interface PropertyType {
  id: string;
  name: string;
}

interface SearchResult {
  description: string;
  place_id: string;
  geometry?: { location: { lat: number; lng: number } };
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  available: { label: 'Available', dot: '●', bg: '#d8f3dc', text: '#1a4731' },
  sold: { label: 'Sold', dot: '●', bg: '#fee2e2', text: '#dc2626' },
  rented: { label: 'Rented', dot: '●', bg: '#dbeafe', text: '#2563eb' },
  under_offer: { label: 'Pending', dot: '●', bg: '#fef3c7', text: '#92400e' },
  off_market: { label: 'Off Market', dot: '●', bg: '#f1f5f9', text: '#475569' },
};

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
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileView, setMobileView] = useState<'both' | 'map' | 'list'>('both');
  const [detailProperty, setDetailProperty] = useState<Property | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const centerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { profile } = useAuth();

  // ────────────── MAP INIT ──────────────
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

      // Remove default nav control — we add custom buttons
      map.on("load", () => {
        setMapLoading(false);
        mapRef.current = map;
        setTimeout(() => map.resize(), 100);

        map.addSource("radius-circle", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "radius-fill", type: "fill", source: "radius-circle",
          paint: { "fill-color": "#40916c", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "radius-line", type: "line", source: "radius-circle",
          paint: { "line-color": "#40916c", "line-width": 2, "line-opacity": 0.5 },
        });
      });

      map.on("error", (e) => console.warn("Map error (non-fatal):", e));

      return () => { map.remove(); mapRef.current = null; };
    } catch (err) {
      console.error("Map init error:", err);
      setMapLoading(false);
    }
  }, []);

  // ────────────── DATA FETCH ──────────────
  useEffect(() => {
    fetchPropertyTypes();
    fetchAllProperties();
  }, []);

  useEffect(() => { filterProperties(); }, [center, radius, selectedType, priceRange, allProperties, hasSearched, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mapRef.current) mapRef.current.flyTo({ center: [center.lng, center.lat], duration: 800 });
  }, [center]);

  useEffect(() => {
    if (!mapRef.current || !hasSearched) return;
    const source = mapRef.current.getSource("radius-circle") as maplibregl.GeoJSONSource;
    if (source) {
      const circleGeoJSON = turf.circle([center.lng, center.lat], radius[0], { units: "kilometers" });
      source.setData(circleGeoJSON);
    }
  }, [center, radius, hasSearched]);

  useEffect(() => {
    if (centerMarkerRef.current) { centerMarkerRef.current.remove(); centerMarkerRef.current = null; }
    if (hasSearched && mapRef.current) {
      const el = document.createElement("div");
      el.style.cssText = "width:20px;height:20px;border-radius:50%;background:#40916c;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)";
      centerMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([center.lng, center.lat]).addTo(mapRef.current);
    }
  }, [center, hasSearched]);

  // ────────────── MARKERS ──────────────
  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (!mapRef.current) return;

    filteredProperties.forEach((property) => {
      const isSelected = selectedProperty?.id === property.id;
      const isHovered = hoveredPropertyId === property.id;
      const el = createMarkerElement(
        { title: property.title, price: property.price, status: property.status },
        isSelected, isHovered
      );

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([property.lng, property.lat])
        .addTo(mapRef.current!);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedProperty(property);
        setDetailProperty(property);
        scrollToCard(property.id);
      });

      el.addEventListener("mouseenter", () => setHoveredPropertyId(property.id));
      el.addEventListener("mouseleave", () => setHoveredPropertyId(null));

      markersRef.current.push(marker);
    });
  }, [filteredProperties, selectedProperty, hoveredPropertyId]);

  // ────────────── DATA FUNCTIONS (preserved) ──────────────
  const fetchPropertyTypes = async () => {
    const { data } = await supabase.from("property_types").select("id, name");
    if (data) setPropertyTypes(data);
  };

  const fetchAllProperties = async () => {
    setDataLoading(true);
    const { data, error } = await (supabase.rpc as any)("get_properties_with_coords");

    if (error) {
      console.error("Error fetching properties:", error);
      const { data: fallbackData } = await supabase
        .from("properties")
        .select("id, title, address, price, property_type_id, bedrooms, bathrooms, area_sqft, images, location, status, description")
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
              status: p.status, description: p.description,
            });
          }
        }
        setAllProperties(props);
      }
      setDataLoading(false);
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
    setDataLoading(false);
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.address && p.address.toLowerCase().includes(q))
      );
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

  const searchPlace = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
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
      } else { setSearchResults([]); setShowResults(false); }
    } catch (err) { console.error("Autocomplete error:", err); setSearchResults([]); setShowResults(false); }
    setIsSearching(false);
  }, [center]);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlace(value), 300);
  };

  const selectPlace = (result: SearchResult) => {
    if (result.geometry?.location) { setCenter(result.geometry.location); setHasSearched(true); }
    setSearchQuery(result.description.split(",")[0]);
    setShowResults(false);
  };

  const scrollToCard = (id: string) => {
    const el = cardRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleCardClick = (property: Property) => {
    setSelectedProperty(property);
    setDetailProperty(property);
    if (mapRef.current && property.lat && property.lng) {
      mapRef.current.flyTo({ center: [property.lng, property.lat], zoom: 15, duration: 800 });
    }
  };

  const handleFitAll = () => {
    if (!mapRef.current || filteredProperties.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    filteredProperties.forEach((p) => bounds.extend([p.lng, p.lat]));
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 800 });
  };

  const getStatusBadge = (status?: string) => {
    const cfg = STATUS_CONFIG[status || 'available'] || STATUS_CONFIG.available;
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm"
        style={{ background: `${cfg.bg}e6`, color: cfg.text }}>
        {cfg.dot} {cfg.label}
      </span>
    );
  };

  // ────────────── RENDER ──────────────
  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-3.5rem)] overflow-hidden w-full">
      {/* ═══ LEFT PANEL — Property List ═══ */}
      <div className={`
        ${mobileView === 'map' ? 'hidden md:flex' : 'flex'}
        w-full md:w-[320px] xl:w-[400px] flex-col bg-white dark:bg-card border-r border-[#e2e8ed]
        ${mobileView === 'list' ? 'flex-1 md:flex-none' : ''}
        md:h-full
      `}>
        {/* Filter Bar */}
        <div className="flex-shrink-0 border-b border-[#e2e8ed] p-4 space-y-2.5">
          {/* Search */}
          <div ref={searchRef} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search by name, location..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-[10px] border border-[#e2e8ed] bg-[#f8fafb] outline-none focus:border-[#40916c] transition-colors font-medium"
            />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#94a3b8]" />}

            {showResults && searchResults.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-card border border-[#e2e8ed] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button key={index}
                    className="w-full px-4 py-3 text-left hover:bg-[#f8fafb] text-sm border-b border-[#e2e8ed] last:border-b-0 flex items-start gap-2"
                    onClick={() => selectPlace(result)}>
                    <MapPin className="h-4 w-4 text-[#40916c] shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-[#1e293b]">{result.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <FilterChip
              label={selectedType === 'all' ? 'All Types' : propertyTypes.find(t => t.id === selectedType)?.name || 'All Types'}
              active={selectedType !== 'all'}
              options={[{ value: 'all', label: 'All Types' }, ...propertyTypes.map(t => ({ value: t.id, label: t.name }))]}
              onChange={setSelectedType}
            />
            <FilterChip
              label={priceRange === 'all' ? 'Any Price' : priceRange}
              active={priceRange !== 'all'}
              options={[
                { value: 'all', label: 'Any Price' },
                { value: '0-5000000', label: 'Under ₹50L' },
                { value: '5000000-10000000', label: '₹50L–₹1Cr' },
                { value: '10000000-50000000', label: '₹1Cr–₹5Cr' },
                { value: '50000000-', label: 'Above ₹5Cr' },
              ]}
              onChange={setPriceRange}
            />
          </div>

          {/* Results Count + View Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: '#d8f3dc', color: '#1a4731' }}>
              {filteredProperties.length} properties
            </span>
            <div className="flex gap-1">
              <button onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#1a4731] text-white' : 'bg-[#f1f4f6] text-[#94a3b8]'}`}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#1a4731] text-white' : 'bg-[#f1f4f6] text-[#94a3b8]'}`}>
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Property List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {dataLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-[14px] border border-[#e2e8ed] overflow-hidden">
                  <Skeleton className="h-[140px] w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </>
          ) : filteredProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4 opacity-30">🏠</div>
              <p className="text-base font-bold text-[#1e293b]">No properties found</p>
              <p className="text-[13px] text-[#94a3b8] mt-1">Try adjusting your filters</p>
            </div>
          ) : viewMode === 'grid' ? (
            filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSelected={selectedProperty?.id === property.id}
                isHovered={hoveredPropertyId === property.id}
                onMouseEnter={() => setHoveredPropertyId(property.id)}
                onMouseLeave={() => setHoveredPropertyId(null)}
                onClick={() => handleCardClick(property)}
                onViewDetails={() => setDetailProperty(property)}
                ref={(el) => { if (el) cardRefs.current.set(property.id, el); }}
                getStatusBadge={getStatusBadge}
              />
            ))
          ) : (
            filteredProperties.map((property) => (
              <PropertyListItem
                key={property.id}
                property={property}
                isSelected={selectedProperty?.id === property.id}
                onClick={() => handleCardClick(property)}
                ref={(el) => { if (el) cardRefs.current.set(property.id, el); }}
                getStatusBadge={getStatusBadge}
              />
            ))
          )}
        </div>
      </div>

      {/* ═══ RIGHT — MAP ═══ */}
      <div className={`
        ${mobileView === 'list' ? 'hidden md:block' : 'block'}
        flex-1 relative
        ${mobileView === 'map' ? 'flex-1' : 'h-[300px] min-h-[300px] md:h-full'}
      `}>
        {mapLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f8fafb] z-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#40916c]" />
          </div>
        )}

        <div ref={mapContainerRef}
          className="w-full block relative"
          style={{ height: '100%', minHeight: '300px' }}
        />

        {/* Custom Map Controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          <button onClick={() => mapRef.current?.zoomIn()}
            className="w-10 h-10 rounded-lg bg-white border border-[#e2e8ed] shadow-md flex items-center justify-center text-[#1e293b] hover:bg-[#f8fafb] transition-colors text-lg font-bold">
            +
          </button>
          <button onClick={() => mapRef.current?.zoomOut()}
            className="w-10 h-10 rounded-lg bg-white border border-[#e2e8ed] shadow-md flex items-center justify-center text-[#1e293b] hover:bg-[#f8fafb] transition-colors text-lg font-bold">
            −
          </button>
          <button onClick={handleFitAll} title="Fit all markers"
            className="w-10 h-10 rounded-lg bg-white border border-[#e2e8ed] shadow-md flex items-center justify-center text-[#1e293b] hover:bg-[#f8fafb] transition-colors">
            <Locate className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile View Toggle */}
        <div className="absolute top-3 left-3 z-10 md:hidden flex gap-1.5">
          <button onClick={() => setMobileView(mobileView === 'map' ? 'both' : 'map')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md border transition-colors ${
              mobileView === 'map' ? 'bg-[#1a4731] text-white border-[#1a4731]' : 'bg-white text-[#1e293b] border-[#e2e8ed]'
            }`}>
            <MapIcon className="h-3 w-3 inline mr-1" /> Map
          </button>
          <button onClick={() => setMobileView(mobileView === 'list' ? 'both' : 'list')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md border transition-colors ${
              mobileView === 'list' ? 'bg-[#1a4731] text-white border-[#1a4731]' : 'bg-white text-[#1e293b] border-[#e2e8ed]'
            }`}>
            <List className="h-3 w-3 inline mr-1" /> List
          </button>
        </div>

        {/* No properties toast on map */}
        {!dataLoading && filteredProperties.length === 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-md border border-[#e2e8ed]">
            <span className="text-xs font-semibold text-[#94a3b8]">No properties to display</span>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailProperty && (
        <PropertyDetailModal
          property={detailProperty}
          onClose={() => { setDetailProperty(null); setSelectedProperty(null); }}
          onLocate={(p) => {
            if (mapRef.current) mapRef.current.flyTo({ center: [p.lng, p.lat], zoom: 16, duration: 800 });
          }}
        />
      )}
    </div>
  );
}

// ────────────── FilterChip ──────────────
function FilterChip({ label, active, options, onChange }: {
  label: string;
  active: boolean;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
          active ? 'bg-[#1a4731] text-white border-[#1a4731]' : 'bg-white text-[#4b5563] border-[#e2e8ed] hover:border-[#94a3b8]'
        }`}>
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#e2e8ed] rounded-lg shadow-lg z-50 min-w-[140px] py-1">
          {options.map((opt) => (
            <button key={opt.value}
              className="w-full px-3 py-2 text-left text-xs font-medium text-[#1e293b] hover:bg-[#f8fafb] transition-colors"
              onClick={() => { onChange(opt.value); setOpen(false); }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────── PropertyCard (Grid) ──────────────
import { forwardRef } from 'react';

const PropertyCard = forwardRef<HTMLDivElement, {
  property: Property;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onViewDetails: () => void;
  getStatusBadge: (status?: string) => React.ReactNode;
}>(({ property, isSelected, isHovered, onMouseEnter, onMouseLeave, onClick, onViewDetails, getStatusBadge }, ref) => (
  <div
    ref={ref}
    className="rounded-[14px] overflow-hidden cursor-pointer group"
    style={{
      border: isSelected ? '2px solid #1a4731' : '1px solid #e2e8ed',
      boxShadow: isSelected ? '0 0 0 3px rgba(64,145,108,0.15)' : isHovered ? '0 6px 20px rgba(0,0,0,0.08)' : 'none',
      transform: isHovered ? 'translateY(-2px)' : 'none',
      transition: 'all 0.18s ease',
      background: 'white',
    }}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onClick={onClick}
  >
    {/* Image */}
    <div className="h-[160px] relative overflow-hidden">
      {property.images?.[0] ? (
        <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #d8f3dc, #f0faf4)' }}>
          <span className="text-[32px]">🏠</span>
        </div>
      )}
      <div className="absolute top-2 left-2">{getStatusBadge(property.status)}</div>
      {!property.lat && !property.lng && (
        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-[#94a3b8]">
            📍 Location not set
          </span>
        </div>
      )}
    </div>

    {/* Content */}
    <div className="p-3">
      <h3 className="text-sm font-bold text-[#1e293b] truncate">{property.title}</h3>
      {property.address && (
        <p className="text-[11.5px] text-[#94a3b8] mt-0.5 truncate flex items-center gap-1">
          <MapPin className="h-3 w-3 flex-shrink-0" /> {property.address}
        </p>
      )}

      {/* Specs */}
      <div className="flex items-center gap-3 mt-2 text-[11px] text-[#4b5563]">
        {property.bedrooms != null && <span>🛏 {property.bedrooms}</span>}
        {property.bathrooms != null && <span>🚿 {property.bathrooms}</span>}
        {property.area_sqft != null && <span>📐 {property.area_sqft}</span>}
        {property.price != null && (
          <span className="font-bold text-[#1a4731]">💰 {formatPrice(property.price)}</span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2.5 pt-2 border-t border-[#f8fafb] flex justify-end gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-[7px] text-white transition-colors"
          style={{ background: '#1a4731' }}>
          View Details
        </button>
      </div>
    </div>
  </div>
));
PropertyCard.displayName = 'PropertyCard';

// ────────────── PropertyListItem ──────────────
const PropertyListItem = forwardRef<HTMLDivElement, {
  property: Property;
  isSelected: boolean;
  onClick: () => void;
  getStatusBadge: (status?: string) => React.ReactNode;
}>(({ property, isSelected, onClick, getStatusBadge }, ref) => (
  <div
    ref={ref}
    className="flex items-center gap-3 p-2 rounded-[10px] cursor-pointer transition-all hover:shadow-sm"
    style={{
      border: isSelected ? '2px solid #1a4731' : '1px solid #e2e8ed',
      background: 'white',
    }}
    onClick={onClick}
  >
    <div className="w-[72px] h-[72px] rounded-lg overflow-hidden flex-shrink-0">
      {property.images?.[0] ? (
        <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #d8f3dc, #f0faf4)' }}>
          <span className="text-xl">🏠</span>
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-[13px] font-bold text-[#1e293b] truncate">{property.title}</h3>
      <div className="mt-0.5">{getStatusBadge(property.status)}</div>
      {property.price != null && (
        <span className="text-xs font-bold text-[#1a4731] mt-0.5 block">
          {formatPrice(property.price)}
        </span>
      )}
    </div>
  </div>
));
PropertyListItem.displayName = 'PropertyListItem';
