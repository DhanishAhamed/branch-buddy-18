import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Building2, MapPin, IndianRupee } from 'lucide-react';
import { AddPropertyDialog } from '@/components/properties/AddPropertyDialog';

interface Property {
  id: string;
  title: string;
  address: string | null;
  price: number | null;
  area_sqft: number | null;
  status: string;
  property_type: { name: string } | null;
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { profile, isAdmin } = useAuth();

  useEffect(() => {
    fetchProperties();
  }, [profile]);

  const fetchProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('id, title, address, price, area_sqft, status, property_type:property_types(name)')
      .order('created_at', { ascending: false });
    
    if (data) setProperties(data as Property[]);
  };

  const filteredProperties = properties.filter(prop =>
    prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prop.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    available: 'bg-primary/10 text-primary',
    under_offer: 'bg-yellow-500/10 text-yellow-600',
    sold: 'bg-destructive/10 text-destructive',
    rented: 'bg-blue-500/10 text-blue-600',
    off_market: 'bg-muted text-muted-foreground',
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
    return `₹${price.toLocaleString()}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Properties</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProperties.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No properties found</p>
            </CardContent>
          </Card>
        ) : (
          filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                <Building2 className="h-16 w-16 text-primary/50" />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground line-clamp-1">{property.title}</h3>
                  <Badge className={statusColors[property.status] || 'bg-muted'}>
                    {property.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                {property.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <MapPin className="h-3 w-3" />
                    {property.address}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3">
                  {property.price && (
                    <span className="text-lg font-bold text-primary flex items-center">
                      {formatPrice(property.price)}
                    </span>
                  )}
                  {property.area_sqft && (
                    <span className="text-sm text-muted-foreground">
                      {property.area_sqft.toLocaleString()} sqft
                    </span>
                  )}
                </div>

                {property.property_type && (
                  <Badge variant="outline" className="mt-2">
                    {property.property_type.name}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddPropertyDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchProperties}
      />
    </div>
  );
}
