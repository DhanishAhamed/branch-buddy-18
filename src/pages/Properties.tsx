import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Search, Building2, MapPin, Bed, Bath, Maximize, Pencil, MoreVertical, CheckCircle, XCircle, SlidersHorizontal, ArrowUpDown, LayoutGrid, List, Eye } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
      const matchesSearch = prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.address?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (!showSold && (prop.status === 'sold' || prop.status === 'rented')) return false;
      if (portalFilter !== 'all' && prop.portal_type !== portalFilter) return false;
      if (propertyTypeFilter !== 'all' && prop.property_type_id !== propertyTypeFilter) return false;
      if (statusFilter !== 'all' && prop.status !== statusFilter) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return 0;
        case 'oldest': return 0;
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

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
    if (price >= 1000) return `₹${(price / 1000).toFixed(0)}K`;
    return `₹${price.toLocaleString()}`;
  };

  const canEdit = isAdmin || profile?.can_edit_properties;

  // Stat counts
  const totalCount = properties.length;
  const availableCount = properties.filter(p => p.status === 'available').length;
  const soldRentedCount = properties.filter(p => p.status === 'sold' || p.status === 'rented').length;
  const pendingCount = properties.filter(p => p.status === 'under_offer' || p.status === 'off_market').length;

  const propertyTypeEmoji = (name?: string) => {
    if (!name) return '🏠';
    const n = name.toLowerCase();
    if (n.includes('apartment') || n.includes('flat')) return '🏢';
    if (n.includes('villa')) return '🏰';
    if (n.includes('hostel')) return '🏨';
    if (n.includes('house') || n.includes('home')) return '🏡';
    if (n.includes('commercial') || n.includes('office') || n.includes('shop')) return '🏬';
    if (n.includes('land') || n.includes('plot')) return '🌳';
    return '🏠';
  };

  return (
    <div className="p-3 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[800] text-foreground leading-tight">Properties</h1>
          <p className="text-muted-foreground text-sm mt-1">{filteredAndSortedProperties.length} properties in your portfolio</p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-[11px] rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-[1px]"
          style={{
            background: '#1a4731',
            boxShadow: '0 4px 14px rgba(26,71,49,0.25)',
          }}
        >
          <Plus className="h-4 w-4" />
          Add Property
        </button>
      </div>

      {/* Mini Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { emoji: '🏠', label: 'Total Properties', value: totalCount, iconBg: '#f0faf4', valueColor: '#1e293b' },
          { emoji: '✅', label: 'Available', value: availableCount, iconBg: '#d1fae5', valueColor: '#1a4731' },
          { emoji: '🔴', label: 'Sold / Rented', value: soldRentedCount, iconBg: '#fee2e2', valueColor: '#dc2626' },
          { emoji: '📋', label: 'Pending Review', value: pendingCount, iconBg: '#fef3c7', valueColor: '#f59e0b' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-4 transition-shadow hover:shadow-md"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
              style={{ background: stat.iconBg }}
            >
              {stat.emoji}
            </div>
            <div>
              <p className="text-xl font-[800] leading-none" style={{ color: stat.valueColor }}>
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-[10px] border-border bg-card hover:border-[hsl(var(--green-accent))] transition-colors"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scroll-x-hidden pb-1 items-center">
          <Select value={portalFilter} onValueChange={setPortalFilter}>
            <SelectTrigger className="w-[130px] md:w-[140px] rounded-[10px] border-border bg-card shrink-0">
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
            <SelectTrigger className="w-[140px] md:w-[160px] rounded-[10px] border-border bg-card shrink-0">
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
            <SelectTrigger className="w-[130px] md:w-[140px] rounded-[10px] border-border bg-card shrink-0">
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
            <SelectTrigger className="w-[140px] md:w-[150px] rounded-[10px] border-border bg-card shrink-0">
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

          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={showSold} onCheckedChange={setShowSold} id="show-sold" />
            <Label htmlFor="show-sold" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">Sold/Rented</Label>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#1a4731] text-white' : 'bg-card text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[#1a4731] text-white' : 'bg-card text-muted-foreground hover:text-foreground'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border bg-card">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#f1f4f6' }}>
            <Building2 className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-bold text-base text-muted-foreground mb-1">No properties found</h3>
          <p className="text-muted-foreground text-[13px] mb-4">
            {!showSold && properties.some(p => p.status === 'sold' || p.status === 'rented')
              ? 'Some properties are hidden. Toggle "Show Sold/Rented" to see them.'
              : 'Try adjusting your filters or add a new property'}
          </p>
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ background: '#1a4731' }}
          >
            <Plus className="h-4 w-4" />
            Add Property
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid gap-[18px] grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAndSortedProperties.map((property, idx) => {
            const isSoldOrRented = property.status === 'sold' || property.status === 'rented';
            const firstImage = property.images?.[0];

            const statusBadgeStyles: Record<string, { bg: string; color: string; label: string }> = {
              available: { bg: '#d8f3dc', color: '#1a4731', label: 'Available' },
              under_offer: { bg: '#fef3c7', color: '#92400e', label: 'Under Offer' },
              sold: { bg: '#fee2e2', color: '#dc2626', label: 'Sold' },
              rented: { bg: '#fef3c7', color: '#92400e', label: 'Rented' },
              off_market: { bg: '#f1f4f6', color: '#4b5563', label: 'Off Market' },
            };
            const sBadge = statusBadgeStyles[property.status] || statusBadgeStyles.available;

            return (
              <div
                key={property.id}
                className="group rounded-[18px] border border-border bg-card overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)]"
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => setSelectedProperty(property)}
              >
                {/* Image */}
                <div className={`relative h-[180px] overflow-hidden ${isSoldOrRented ? 'grayscale' : ''}`} style={{ background: '#f1f4f6' }}>
                  {firstImage ? (
                    <img
                      src={firstImage}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      <span className="text-[11px] text-muted-foreground/50">No image uploaded</span>
                    </div>
                  )}

                  {/* Status badge */}
                  <span
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm"
                    style={{ background: sBadge.bg, color: sBadge.color }}
                  >
                    {sBadge.label}
                  </span>

                  {/* Portal badge */}
                  {property.portal_type && (
                    <span
                      className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-semibold text-white capitalize backdrop-blur-sm"
                      style={{ background: 'rgba(26,71,49,0.85)' }}
                    >
                      {property.portal_type}
                    </span>
                  )}

                  {/* Edit controls on hover */}
                  {canEdit && (
                    <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ top: property.portal_type ? '38px' : '12px' }}>
                      <button
                        className="h-7 w-7 rounded-md flex items-center justify-center bg-card/90 backdrop-blur-sm border border-border shadow-sm hover:bg-card"
                        onClick={(e) => { e.stopPropagation(); setEditProperty(property); }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="h-7 w-7 rounded-md flex items-center justify-center bg-card/90 backdrop-blur-sm border border-border shadow-sm hover:bg-card"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {property.status !== 'sold' && property.portal_type !== 'rentals' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updatePropertyStatus(property.id, 'sold'); }}>
                              <CheckCircle className="h-4 w-4 mr-2" style={{ color: '#dc2626' }} />
                              Mark as Sold
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'rented' && property.portal_type === 'rentals' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updatePropertyStatus(property.id, 'rented'); }}>
                              <CheckCircle className="h-4 w-4 mr-2" style={{ color: '#2563eb' }} />
                              Mark as Rented
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'available' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updatePropertyStatus(property.id, 'available'); }}>
                              <XCircle className="h-4 w-4 mr-2" style={{ color: '#40916c' }} />
                              Mark as Available
                            </DropdownMenuItem>
                          )}
                          {property.status !== 'under_offer' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updatePropertyStatus(property.id, 'under_offer'); }}>
                              <CheckCircle className="h-4 w-4 mr-2" style={{ color: '#f59e0b' }} />
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

                {/* Card Body */}
                <div className="p-4 space-y-2.5">
                  {/* Title + Price row */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-[15px] text-foreground capitalize line-clamp-1">
                      {property.title}
                    </h3>
                    {property.price ? (
                      <span className="text-[16px] font-[800] shrink-0" style={{ color: '#1a4731' }}>
                        {formatPrice(property.price)}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground font-semibold shrink-0">Price on request</span>
                    )}
                  </div>

                  {/* Property type pill */}
                  {property.property_type && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                      style={{ background: '#f0faf4', color: '#1a4731' }}
                    >
                      {propertyTypeEmoji(property.property_type.name)} {property.property_type.name}
                    </span>
                  )}

                  {/* Location */}
                  {property.address && (
                    <p className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 line-clamp-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {property.address}
                    </p>
                  )}

                  {/* Specs */}
                  {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                    <div className="flex items-center gap-3.5 py-2.5 border-t border-b border-border/50 text-[12px] font-medium text-muted-foreground">
                      {property.bedrooms != null && (
                        <span className="flex items-center gap-1">
                          <Bed className="h-3.5 w-3.5" /> {property.bedrooms}
                        </span>
                      )}
                      {property.bathrooms != null && (
                        <span className="flex items-center gap-1">
                          <Bath className="h-3.5 w-3.5" /> {property.bathrooms}
                        </span>
                      )}
                      {property.area_sqft != null && (
                        <span className="flex items-center gap-1">
                          <Maximize className="h-3.5 w-3.5" /> {property.area_sqft.toLocaleString()} sqft
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#40916c' }} />
                      0 inquiries
                    </span>
                    <div className="flex gap-1.5">
                      {canEdit && (
                        <button
                          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-border text-muted-foreground hover:bg-accent transition-colors"
                          onClick={(e) => { e.stopPropagation(); setEditProperty(property); }}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors"
                        style={{ background: '#1a4731' }}
                        onClick={(e) => { e.stopPropagation(); setSelectedProperty(property); }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredAndSortedProperties.map((property) => {
            const firstImage = property.images?.[0];
            const isSoldOrRented = property.status === 'sold' || property.status === 'rented';
            const statusBadgeStyles: Record<string, { bg: string; color: string; label: string }> = {
              available: { bg: '#d8f3dc', color: '#1a4731', label: 'Available' },
              under_offer: { bg: '#fef3c7', color: '#92400e', label: 'Under Offer' },
              sold: { bg: '#fee2e2', color: '#dc2626', label: 'Sold' },
              rented: { bg: '#fef3c7', color: '#92400e', label: 'Rented' },
              off_market: { bg: '#f1f4f6', color: '#4b5563', label: 'Off Market' },
            };
            const sBadge = statusBadgeStyles[property.status] || statusBadgeStyles.available;

            return (
              <div
                key={property.id}
                className="flex items-center gap-4 rounded-[14px] border border-border bg-card p-3.5 md:p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:translate-x-[2px]"
                onClick={() => setSelectedProperty(property)}
              >
                {/* Thumbnail */}
                <div className={`w-[72px] h-[60px] rounded-[10px] overflow-hidden shrink-0 ${isSoldOrRented ? 'grayscale' : ''}`} style={{ background: '#f1f4f6' }}>
                  {firstImage ? (
                    <img src={firstImage} alt={property.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">{property.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    {property.address && (
                      <span className="text-[12px] text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" /> {property.address}
                      </span>
                    )}
                    {property.property_type && (
                      <span className="text-[11px] text-muted-foreground">• {property.property_type.name}</span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="hidden sm:block shrink-0">
                  {property.price ? (
                    <span className="text-[15px] font-[800]" style={{ color: '#1a4731' }}>
                      {formatPrice(property.price)}
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted-foreground">Price on request</span>
                  )}
                </div>

                {/* Status */}
                <span
                  className="hidden md:inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
                  style={{ background: sBadge.bg, color: sBadge.color }}
                >
                  {sBadge.label}
                </span>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  {canEdit && (
                    <button
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-border text-muted-foreground hover:bg-accent transition-colors"
                      onClick={(e) => { e.stopPropagation(); setEditProperty(property); }}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors"
                    style={{ background: '#1a4731' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedProperty(property); }}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Property Detail Modal */}
      <Dialog open={!!selectedProperty} onOpenChange={(open) => !open && setSelectedProperty(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedProperty && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProperty.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const statusBadgeStyles: Record<string, { bg: string; color: string; label: string }> = {
                      available: { bg: '#d8f3dc', color: '#1a4731', label: 'Available' },
                      under_offer: { bg: '#fef3c7', color: '#92400e', label: 'Under Offer' },
                      sold: { bg: '#fee2e2', color: '#dc2626', label: 'Sold' },
                      rented: { bg: '#fef3c7', color: '#92400e', label: 'Rented' },
                      off_market: { bg: '#f1f4f6', color: '#4b5563', label: 'Off Market' },
                    };
                    const s = statusBadgeStyles[selectedProperty.status] || statusBadgeStyles.available;
                    return (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    );
                  })()}
                  {selectedProperty.property_type && (
                    <Badge variant="outline">{selectedProperty.property_type.name}</Badge>
                  )}
                  {selectedProperty.portal_type && (
                    <Badge variant="outline" className="capitalize">{selectedProperty.portal_type}</Badge>
                  )}
                </DialogDescription>
              </DialogHeader>

              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden h-56" style={{ background: '#f1f4f6' }}>
                    <img
                      src={selectedProperty.images[0]}
                      alt={selectedProperty.title}
                      className={`w-full h-full object-cover ${selectedProperty.status === 'sold' || selectedProperty.status === 'rented' ? 'grayscale' : ''}`}
                    />
                  </div>
                  {selectedProperty.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {selectedProperty.images.slice(1, 5).map((img, idx) => (
                        <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden shrink-0" style={{ background: '#f1f4f6' }}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {selectedProperty.images.length > 5 && (
                        <div className="w-20 h-20 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f1f4f6' }}>
                          <span className="text-xs text-muted-foreground">+{selectedProperty.images.length - 5}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedProperty.price && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Price</Label>
                    <p className="text-lg font-[800]" style={{ color: '#1a4731' }}>
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
