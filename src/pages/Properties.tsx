import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Building2, MapPin, Bed, Bath, Maximize, Pencil, MoreVertical, CheckCircle, XCircle, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
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
  owner_details?: any;
}

type SortOption = 'newest' | 'oldest' | 'price_high' | 'price_low' | 'name_az' | 'name_za';

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showSold, setShowSold] = useState(false);
  const [portalFilter, setPortalFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [propertyTypes, setPropertyTypes] = useState<{ id: string; name: string }[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const { profile, isAdmin } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.branch_id || isAdmin) {
      fetchProperties();
      fetchPropertyTypes();
    }
  }, [profile, activeWorkspace?.id, isAdmin]);

  const fetchPropertyTypes = async () => {
    const { data } = await supabase.from('property_types').select('id, name');
    if (data) setPropertyTypes(data);
  };

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, description, address, price, area_sqft, bedrooms, bathrooms, status, portal_type, property_type_id, images, location, owner_details, property_type:property_types(name)')
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
      toast({ title: 'Error', description: 'Failed to update property status', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Property marked as ${newStatus.replace('_', ' ')}` });
      fetchProperties();
    }
  };

  const filteredAndSortedProperties = useMemo(() => {
    let result = properties.filter(prop => {
      // Search
      const matchesSearch = prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.address?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Sold/rented toggle — hide sold/rented unless toggled on
      if (!showSold && (prop.status === 'sold' || prop.status === 'rented')) return false;

      // Portal filter
      if (portalFilter !== 'all' && prop.portal_type !== portalFilter) return false;

      // Property type filter
      if (propertyTypeFilter !== 'all' && prop.property_type_id !== propertyTypeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && prop.status !== statusFilter) return false;

      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return 0; // already sorted by created_at desc
        case 'oldest': return 0; // reverse below
        case 'price_high': return (b.price || 0) - (a.price || 0);
        case 'price_low': return (a.price || 0) - (b.price || 0);
        case 'name_az': return a.title.localeCompare(b.title);
        case 'name_za': return b.title.localeCompare(a.title);
        default: return 0;
      }
    });

    if (sortBy === 'oldest') result.reverse();

    return result;
  }, [properties, searchQuery, showSold, portalFilter, propertyTypeFilter, statusFilter, sortBy]);

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
          <p className="text-muted-foreground text-sm">{filteredAndSortedProperties.length} properties in your portfolio</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Search, Filters & Sort */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        <Select value={portalFilter} onValueChange={setPortalFilter}>
          <SelectTrigger className="w-[140px] bg-card">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Portal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Portals</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>

        <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {propertyTypes.map(pt => (
              <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="under_offer">Under Offer</SelectItem>
            <SelectItem value="off_market">Off Market</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="rented">Rented</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[150px] bg-card">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="price_high">Price: High→Low</SelectItem>
            <SelectItem value="price_low">Price: Low→High</SelectItem>
            <SelectItem value="name_az">Name: A→Z</SelectItem>
            <SelectItem value="name_za">Name: Z→A</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Switch checked={showSold} onCheckedChange={setShowSold} id="show-sold" />
          <Label htmlFor="show-sold" className="text-sm text-muted-foreground cursor-pointer">Show Sold/Rented</Label>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedProperties.length === 0 ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No properties found</h3>
              <p className="text-muted-foreground text-sm">
                {!showSold && properties.some(p => p.status === 'sold' || p.status === 'rented')
                  ? 'Some properties are hidden. Toggle "Show Sold/Rented" to see them.'
                  : 'Add your first property to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedProperties.map((property) => {
            const status = statusConfig[property.status] || statusConfig.available;
            const portalColor = property.portal_type ? portalColors[property.portal_type] : '';
            const firstImage = property.images?.[0];
            const isSoldOrRented = property.status === 'sold' || property.status === 'rented';
            
            return (
              <Card 
                key={property.id} 
                className={`overflow-hidden hover:shadow-lg transition-all duration-300 group border-l-4 ${portalColor} cursor-pointer ${isSoldOrRented ? 'opacity-70' : ''}`}
                onClick={() => setSelectedProperty(property)}
              >
                {/* Property Image */}
                <div className={`h-40 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative overflow-hidden ${isSoldOrRented ? 'grayscale' : ''}`}>
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
                        onClick={(e) => { e.stopPropagation(); setEditProperty(property); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {property.status !== 'sold' && property.portal_type !== 'rentals' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updatePropertyStatus(property.id, 'sold'); }}>
                              <CheckCircle className="h-4 w-4 mr-2 text-destructive" />
                              Mark as Sold
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'rented' && property.portal_type === 'rentals' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updatePropertyStatus(property.id, 'rented'); }}>
                              <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                              Mark as Rented
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'available' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updatePropertyStatus(property.id, 'available'); }}>
                              <XCircle className="h-4 w-4 mr-2 text-primary" />
                              Mark as Available
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'under_offer' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updatePropertyStatus(property.id, 'under_offer'); }}>
                              <CheckCircle className="h-4 w-4 mr-2 text-yellow-500" />
                              Mark as Under Offer
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'off_market' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updatePropertyStatus(property.id, 'off_market'); }}>
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
                  
                  {property.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{property.address}</span>
                    </p>
                  )}

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

                  <div className="pt-2 border-t border-border/50">
                    {property.price ? (
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(property.price)}
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

      {/* Property Detail Modal */}
      <Dialog open={!!selectedProperty} onOpenChange={(open) => !open && setSelectedProperty(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedProperty && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProperty.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${(statusConfig[selectedProperty.status] || statusConfig.available).bg} ${(statusConfig[selectedProperty.status] || statusConfig.available).text} border-0`}>
                    {(statusConfig[selectedProperty.status] || statusConfig.available).label}
                  </Badge>
                  {selectedProperty.property_type && (
                    <Badge variant="outline">{selectedProperty.property_type.name}</Badge>
                  )}
                  {selectedProperty.portal_type && (
                    <Badge variant="outline" className="capitalize">{selectedProperty.portal_type}</Badge>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* Image Gallery */}
              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <div className="space-y-2">
                  <div className="rounded-lg overflow-hidden h-56 bg-muted">
                    <img
                      src={selectedProperty.images[0]}
                      alt={selectedProperty.title}
                      className={`w-full h-full object-cover ${selectedProperty.status === 'sold' || selectedProperty.status === 'rented' ? 'grayscale' : ''}`}
                    />
                  </div>
                  {selectedProperty.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {selectedProperty.images.slice(1, 5).map((img, idx) => (
                        <div key={idx} className="w-20 h-20 rounded-md overflow-hidden shrink-0 bg-muted">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {selectedProperty.images.length > 5 && (
                        <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs text-muted-foreground">+{selectedProperty.images.length - 5}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedProperty.price && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Price</Label>
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(selectedProperty.price)}
                      {selectedProperty.portal_type === 'rentals' && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                    </p>
                  </div>
                )}
                {selectedProperty.area_sqft && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Area</Label>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Maximize className="h-3.5 w-3.5" />
                      {selectedProperty.area_sqft.toLocaleString()} sqft
                    </p>
                  </div>
                )}
                {selectedProperty.bedrooms && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Bed className="h-3.5 w-3.5" />
                      {selectedProperty.bedrooms}
                    </p>
                  </div>
                )}
                {selectedProperty.bathrooms && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Bathrooms</Label>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Bath className="h-3.5 w-3.5" />
                      {selectedProperty.bathrooms}
                    </p>
                  </div>
                )}
              </div>

              {selectedProperty.address && (
                <div>
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <p className="text-sm text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {selectedProperty.address}
                  </p>
                </div>
              )}

              {selectedProperty.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedProperty.description}</p>
                </div>
              )}

              {/* Actions */}
              {canEdit && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => { setSelectedProperty(null); setEditProperty(selectedProperty); }}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Property
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

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
