import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Building2, MapPin, Bed, Bath, Maximize, Pencil, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { AddPropertyDialog } from '@/components/properties/AddPropertyDialog';
import { EditPropertyDialog } from '@/components/properties/EditPropertyDialog';

interface Property {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  price: number | null;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;
  portal_type: string | null;
  property_type_id: string | null;
  property_type: { name: string } | null;
  images: string[] | null;
  location?: unknown;
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const { profile, isAdmin } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.branch_id || isAdmin) {
      fetchProperties();
    }
  }, [profile, activeWorkspace?.id, isAdmin]);

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, description, address, price, area_sqft, bedrooms, bathrooms, status, portal_type, property_type_id, images, location, property_type:property_types(name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching properties:', error);
    }
    if (data) setProperties(data as Property[]);
  };

  const updatePropertyStatus = async (propertyId: string, newStatus: 'available' | 'under_offer' | 'sold' | 'rented' | 'off_market') => {
    const { error } = await supabase
      .from('properties')
      .update({ status: newStatus })
      .eq('id', propertyId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update property status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Property marked as ${newStatus.replace('_', ' ')}`,
      });
      fetchProperties();
    }
  };

  const filteredProperties = properties.filter(prop =>
    prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prop.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    available: { bg: 'bg-primary/10', text: 'text-primary', label: 'Available' },
    under_offer: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', label: 'Under Offer' },
    sold: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Sold' },
    rented: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Rented' },
    off_market: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Off Market' },
  };

  const portalColors: Record<string, string> = {
    commercial: 'border-l-blue-500',
    residential: 'border-l-green-500',
    rentals: 'border-l-orange-500',
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
    if (price >= 1000) return `₹${(price / 1000).toFixed(0)}K`;
    return `₹${price.toLocaleString()}`;
  };

  const canEdit = isAdmin || profile?.can_edit_properties;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground text-sm">{filteredProperties.length} properties in your portfolio</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Properties Grid - responsive for tablet */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProperties.length === 0 ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No properties found</h3>
              <p className="text-muted-foreground text-sm">Add your first property to get started</p>
            </CardContent>
          </Card>
        ) : (
          filteredProperties.map((property) => {
            const status = statusConfig[property.status] || statusConfig.available;
            const portalColor = property.portal_type ? portalColors[property.portal_type] : '';
            const firstImage = property.images?.[0];
            
            return (
              <Card 
                key={property.id} 
                className={`overflow-hidden hover:shadow-lg transition-all duration-300 group border-l-4 ${portalColor}`}
              >
                {/* Property Image */}
                <div className="h-40 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative overflow-hidden">
                  {firstImage ? (
                    <img 
                      src={firstImage} 
                      alt={property.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Building2 className="h-16 w-16 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-300" />
                  )}
                  <Badge className={`absolute top-3 right-3 ${status.bg} ${status.text} border-0`}>
                    {status.label}
                  </Badge>
                  {canEdit && (
                    <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => setEditProperty(property)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="secondary" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {property.status !== 'sold' && property.portal_type !== 'rentals' && (
                            <DropdownMenuItem onClick={() => updatePropertyStatus(property.id, 'sold')}>
                              <CheckCircle className="h-4 w-4 mr-2 text-destructive" />
                              Mark as Sold
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'rented' && property.portal_type === 'rentals' && (
                            <DropdownMenuItem onClick={() => updatePropertyStatus(property.id, 'rented')}>
                              <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                              Mark as Rented
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'available' && (
                            <DropdownMenuItem onClick={() => updatePropertyStatus(property.id, 'available')}>
                              <XCircle className="h-4 w-4 mr-2 text-primary" />
                              Mark as Available
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'under_offer' && (
                            <DropdownMenuItem onClick={() => updatePropertyStatus(property.id, 'under_offer')}>
                              <CheckCircle className="h-4 w-4 mr-2 text-yellow-500" />
                              Mark as Under Offer
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'off_market' && (
                            <DropdownMenuItem onClick={() => updatePropertyStatus(property.id, 'off_market')}>
                              <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                              Mark as Off Market
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-4 space-y-3">
                  {/* Title & Type */}
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {property.title}
                    </h3>
                    {property.property_type && (
                      <Badge variant="outline" className="mt-1.5 text-xs">
                        {property.property_type.name}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Address */}
                  {property.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{property.address}</span>
                    </p>
                  )}

                  {/* Features */}
                  {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {property.bedrooms && (
                        <span className="flex items-center gap-1">
                          <Bed className="h-3.5 w-3.5" />
                          {property.bedrooms}
                        </span>
                      )}
                      {property.bathrooms && (
                        <span className="flex items-center gap-1">
                          <Bath className="h-3.5 w-3.5" />
                          {property.bathrooms}
                        </span>
                      )}
                      {property.area_sqft && (
                        <span className="flex items-center gap-1">
                          <Maximize className="h-3.5 w-3.5" />
                          {property.area_sqft.toLocaleString()} sqft
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="pt-2 border-t border-border/50">
                    {property.price ? (
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(property.price)}
                        {property.portal_type === 'rentals' && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Price on request</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <AddPropertyDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchProperties}
      />

      <EditPropertyDialog
        property={editProperty}
        open={!!editProperty}
        onOpenChange={(open) => !open && setEditProperty(null)}
        onSuccess={fetchProperties}
      />
    </div>
  );
}
