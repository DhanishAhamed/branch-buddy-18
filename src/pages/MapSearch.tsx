import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation, Phone } from 'lucide-react';
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
  const { profile } = useAuth();

  useEffect(() => {
    fetchPropertyTypes();
    fetchProperties();
  }, [radius, selectedType, priceRange, profile]);

  const fetchPropertyTypes = async () => {
    const { data } = await supabase.from('property_types').select('id, name');
    if (data) setPropertyTypes(data);
  };

  const fetchProperties = async () => {
    // Using raw coordinates since PostGIS spatial query would require server-side function
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
      // Filter by radius client-side using Haversine formula
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
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const openDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <Card className="m-4 mb-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Search Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Radius: {radius[0]} km
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
              color: 'hsl(161, 93%, 30%)',
              fillColor: 'hsl(161, 93%, 30%)',
              fillOpacity: 0.1,
            }}
          />

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
        {properties.length} properties found within {radius[0]}km
      </p>
    </div>
  );
}
