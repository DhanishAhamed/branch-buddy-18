import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation, Phone, Search, MapPin, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Property {
  id: string;
  title: string;
  address: string | null;
  price: number | null;
  property_type_id: string | null;
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

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapSearch() {
  const [center, setCenter] = useState<[number, number]>([11.2588, 75.7804]); // Calicut
  const [radius, setRadius] = useState([5]); // km
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();

  useEffect(() => {
    fetchPropertyTypes();
    fetchProperties();
  }, [radius, selectedType, priceRange, profile, center]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPropertyTypes = async () => {
    const { data } = await supabase.from('property_types').select('id, name');
    if (data) setPropertyTypes(data);
  };

  const fetchProperties = async () => {
    let query = supabase
      .from('properties')
      .select('id, title, address, price, property_type_id, location')
      .eq('status', 'available');

    if (selectedType !== 'all') {
      query = query.eq('property_type_id', selectedType);
    }

    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      if (min) query = query.gte('price', min);
      if (max) query = query.lte('price', max);
    }

    const { data } = await query;
    
    if (data) {
      const filtered: Property[] = [];
      for (const p of data) {
        if (!p.location) continue;
        const match = p.location?.toString().match(/POINT\(([^ ]+) ([^)]+)\)/);
        if (match) {
          const lng = parseFloat(match[1]);
          const lat = parseFloat(match[2]);
          const dist = haversineDistance(center[0], center[1], lat, lng);
          if (dist <= radius[0]) {
            filtered.push({
              id: p.id,
              title: p.title,
              address: p.address,
              price: p.price,
              property_type_id: p.property_type_id,
              lat,
              lng,
            });
          }
        }
      }
      setProperties(filtered);
    }
  };

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const searchPlace = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
    setIsSearching(false);
  };

  const selectPlace = (result: SearchResult) => {
    setCenter([parseFloat(result.lat), parseFloat(result.lon)]);
    setSearchQuery(result.display_name);
    setShowResults(false);
  };

  const openDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <Card className="m-4 mb-0 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Search Properties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Place Search */}
          <div ref={searchRef} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a place..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPlace()}
                  className="pl-10"
                />
              </div>
              <Button onClick={searchPlace} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
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
              Search Radius: <span className="text-primary font-semibold">{radius[0]} km</span>
            </label>
            <Slider
              value={radius}
              onValueChange={setRadius}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="flex gap-3">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {propertyTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Price Range" />
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
      <div className="flex-1 m-4 rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController center={center} zoom={12} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Radius circle */}
          <Circle
            center={center}
            radius={radius[0] * 1000}
            pathOptions={{
              color: 'hsl(142, 76%, 36%)',
              fillColor: 'hsl(142, 76%, 36%)',
              fillOpacity: 0.1,
            }}
          />

          {/* Center marker */}
          <Marker position={center}>
            <Popup>
              <div className="text-center p-1">
                <strong>Search Center</strong>
              </div>
            </Popup>
          </Marker>

          {/* Property markers */}
          {properties.map(property => (
            <Marker key={property.id} position={[property.lat, property.lng]}>
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-foreground">{property.title}</h3>
                  {property.address && (
                    <p className="text-sm text-muted-foreground mt-1">{property.address}</p>
                  )}
                  {property.price && (
                    <p className="text-primary font-bold mt-2">
                      ₹{(property.price / 100000).toFixed(0)}L
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => openDirections(property.lat, property.lng)}>
                      <Navigation className="h-4 w-4 mr-1" />
                      Directions
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="text-center text-sm text-muted-foreground pb-4">
        <span className="font-semibold text-primary">{properties.length}</span> properties found within {radius[0]}km
      </p>
    </div>
  );
}
