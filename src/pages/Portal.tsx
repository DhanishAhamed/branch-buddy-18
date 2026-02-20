import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Building2, MapPin, Search, Bed, Bath, Maximize, Phone, Sparkles, ChevronLeft, ChevronRight, X, MessageCircle, Share2, Copy, Facebook, Twitter, Link2, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PropertyDetailModal } from '@/components/portal/PropertyDetailModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface PropertyType {
  id: string;
  name: string;
  portal_type: string;
}

// Share URL generator
const getPropertyShareUrl = (propertyId: string, portalType: string, workspaceSlug?: string) => {
  const baseUrl = window.location.origin;
  const slugPath = workspaceSlug ? `/${workspaceSlug}` : '';
  return `${baseUrl}/portal/${portalType}${slugPath}?property=${propertyId}`;
};

// Share functions
const shareProperty = async (property: Property, portalType: string, method: 'copy' | 'facebook' | 'twitter' | 'whatsapp', toast: any) => {
  const url = getPropertyShareUrl(property.id, portalType);
  const text = `Check out this ${portalType} property: ${property.title}`;

  switch (method) {
    case 'copy':
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!', description: 'Property link copied to clipboard' });
      break;
    case 'facebook':
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      break;
    case 'twitter':
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
      break;
    case 'whatsapp':
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
      break;
  }
};

interface Property {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  price: number | null;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  branch_id: string;
  images: string[] | null;
  status: string;
  property_type: { name: string } | null;
  branch: { name: string; city: string } | null;
  youtube_url?: string | null;
  workspace_id?: string | null;
}

interface Branch {
  id: string;
  name: string;
  city: string;
}

interface WorkspaceWhatsApp {
  id: string;
  whatsapp_number: string | null;
}

const portalConfig = {
  commercial: {
    title: 'Commercial Properties',
    subtitle: 'Find the perfect space for your business',
    gradient: 'from-blue-600 to-blue-800',
    accent: 'text-blue-500',
  },
  residential: {
    title: 'Residential Properties',
    subtitle: 'Discover your dream home',
    gradient: 'from-green-600 to-green-800',
    accent: 'text-green-500',
  },
};

// Placeholder images for properties without images
const placeholderImages = {
  commercial: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop',
  ],
  residential: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop',
  ],
};

// Get a consistent placeholder image based on property ID
const getPlaceholderImage = (propertyId: string, portalType: string) => {
  const images = placeholderImages[portalType as keyof typeof placeholderImages] || placeholderImages.residential;
  // Use property ID to get consistent image
  const index = propertyId.charCodeAt(0) % images.length;
  return images[index];
};

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Generate WhatsApp message URL
const getWhatsAppUrl = (property: Property, portalType: string, whatsappNumber?: string | null) => {
  const priceText = property.price 
    ? `₹${property.price >= 10000000 ? (property.price / 10000000).toFixed(1) + 'Cr' : property.price >= 100000 ? (property.price / 100000).toFixed(0) + 'L' : property.price.toLocaleString()}`
    : 'Price on request';
  
  const message = encodeURIComponent(
    `Hi! I'm interested in this ${portalType} property:\n\n` +
    `🏠 ${property.title}\n` +
    `💰 ${priceText}${portalType === 'rentals' ? '/month' : ''}\n` +
    `📍 ${property.address || property.branch?.city || 'Location not specified'}\n\n` +
    `Please share more details.`
  );

  const cleanNumber = whatsappNumber?.replace(/[^0-9+]/g, '').replace(/^\+/, '') || '';
  return `https://wa.me/${cleanNumber}?text=${message}`;
};

interface PropertyCardProps {
  property: Property;
  config: typeof portalConfig.commercial;
  type: string;
  formatPrice: (price: number) => string;
  onClick: () => void;
  isSold?: boolean;
  onShare: (method: 'copy' | 'facebook' | 'twitter' | 'whatsapp') => void;
  whatsappNumber?: string | null;
}

function PropertyCard({ property, config, type, formatPrice, onClick, isSold = false, onShare, whatsappNumber }: PropertyCardProps) {
  const sold = isSold || property.status === 'sold' || property.status === 'rented';
  const firstImage = property.images?.[0] || getPlaceholderImage(property.id, type);

  return (
    <Card 
      className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group border-0 shadow-md ${sold ? 'opacity-75' : ''}`}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <img 
          src={firstImage} 
          alt={property.title}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${sold ? 'grayscale' : ''}`}
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).src = getPlaceholderImage(property.id, type);
          }}
        />
        
        {/* Status Badge */}
        {sold && (
          <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
            {property.status === 'sold' ? 'SOLD' : 'RENTED'}
          </Badge>
        )}
        
        {/* City Badge */}
        {property.branch && !sold && (
          <Badge className="absolute top-2 left-2 bg-white/90 text-foreground hover:bg-white">
            {property.branch.city}
          </Badge>
        )}

        {/* Share Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-sm"
            >
              <Share2 className="h-4 w-4 text-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-background z-50">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare('copy'); }}>
              <Link2 className="h-4 w-4 mr-2" /> Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare('whatsapp'); }}>
              <MessageCircle className="h-4 w-4 mr-2 text-[#25D366]" /> WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare('facebook'); }}>
              <Facebook className="h-4 w-4 mr-2 text-[#1877F2]" /> Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare('twitter'); }}>
              <Twitter className="h-4 w-4 mr-2 text-[#1DA1F2]" /> Twitter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-foreground line-clamp-1 text-sm group-hover:text-primary transition-colors">
          {property.title}
        </h3>
        
        {/* Address */}
        {property.address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {property.address}
          </p>
        )}

        {/* Features */}
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
                {property.area_sqft.toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Price and WhatsApp */}
        <div className="pt-1 flex items-center justify-between">
          <div>
            {property.price ? (
              <span className={`text-lg font-bold ${sold ? 'text-muted-foreground line-through' : config.accent}`}>
                {formatPrice(property.price)}
                {type === 'rentals' && !sold && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">Price on request</span>
            )}
          </div>
          
          {/* WhatsApp Button */}
          {!sold && (
            <a
              href={getWhatsAppUrl(property, type, whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white transition-colors shadow-sm"
              title="Chat on WhatsApp"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  whatsapp_number: string | null;
}

export default function Portal() {
  const { type, workspaceSlug } = useParams<{ type: 'commercial' | 'residential'; workspaceSlug?: string }>();
  const config = portalConfig[type || 'commercial'];
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('all');
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [enquiryProperty, setEnquiryProperty] = useState<Property | null>(null);
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryEmail, setEnquiryEmail] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workspaceWhatsApp, setWorkspaceWhatsApp] = useState<Record<string, string | null>>({});
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceInfo | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceInfo[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    fetchPropertyTypes();
    fetchProperties();
  }, [type, selectedPropertyType, currentWorkspace]);

  const fetchWorkspaces = async () => {
    // Use workspace_contacts view (public, no auth required)
    const { data } = await supabase
      .from('workspace_contacts' as any)
      .select('id, name, slug, logo_url, whatsapp_number');
    
    if (data) {
      const wsData = (data as unknown) as WorkspaceInfo[];
      setAllWorkspaces(wsData);
      
      const map: Record<string, string | null> = {};
      wsData.forEach((ws) => { map[ws.id] = ws.whatsapp_number; });
      setWorkspaceWhatsApp(map);

      if (workspaceSlug) {
        const matched = wsData.find((w) => w.slug === workspaceSlug);
        if (matched) setCurrentWorkspace(matched);
      }
    }
  };

  const fetchPropertyTypes = async () => {
    const { data } = await supabase.from('property_types').select('*').in('portal_type', [type, 'rentals']);
    if (data) setPropertyTypes(data);
  };

  const fetchProperties = async () => {
    let query = supabase
      .from('properties_public')
      .select('*, property_type:property_types(name), branch:branches(name, city)')
      .in('portal_type', [type, 'rentals'])
      .in('status', ['available', 'sold', 'rented']);

    // Filter by workspace if slug is provided
    if (currentWorkspace) {
      query = query.eq('workspace_id', currentWorkspace.id);
    }

    if (selectedPropertyType !== 'all') {
      query = query.eq('property_type_id', selectedPropertyType);
    }

    const { data } = await query.order('created_at', { ascending: false });
    if (data) setProperties(data as Property[]);
  };

  const filteredProperties = properties.filter(prop =>
    prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prop.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableProperties = filteredProperties.filter(p => p.status === 'available');
  const soldProperties = filteredProperties.filter(p => p.status === 'sold' || p.status === 'rented');

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
    if (price >= 1000) return `₹${(price / 1000).toFixed(0)}K`;
    return `₹${price.toLocaleString()}`;
  };

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryProperty || !enquiryProperty.branch_id) {
      toast({
        title: 'Error',
        description: 'Property information is incomplete. Please try another property.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('leads').insert({
      name: enquiryName,
      email: enquiryEmail || null,
      phone: enquiryPhone || null,
      source: 'portal',
      branch_id: enquiryProperty.branch_id,
      property_id: enquiryProperty.id,
      notes: `Enquiry from ${type} portal for: ${enquiryProperty.title}`,
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Portal enquiry insert error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit enquiry. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Enquiry Submitted! 🎉',
        description: 'Our team will contact you shortly.',
      });
      setEnquiryProperty(null);
      setSelectedProperty(null);
      setEnquiryName('');
      setEnquiryEmail('');
      setEnquiryPhone('');
    }
  };

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
  };

  const handleEnquireFromModal = (property: Property) => {
    setSelectedProperty(null);
    setEnquiryProperty(property);
  };

  // If no workspace slug provided, show workspace selection page
  if (!workspaceSlug && allWorkspaces.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className={`bg-gradient-to-r ${config.gradient} text-white`}>
          <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="max-w-3xl">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{config.title}</h1>
              <p className="text-white/80 text-base">Select a business to browse properties</p>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allWorkspaces.map(ws => (
              <Link key={ws.id} to={`/portal/${type}/${ws.slug}`}>
                <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group border-0 shadow-md">
                  <CardContent className="p-6 flex items-center gap-4">
                    {ws.logo_url ? (
                      <img src={ws.logo_url} alt={ws.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className={`w-12 h-12 bg-gradient-to-br ${config.gradient} rounded-xl flex items-center justify-center`}>
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">{ws.name}</h3>
                      <p className="text-sm text-muted-foreground">View {type} properties</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayName = currentWorkspace?.name || 'Properties';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className={`bg-gradient-to-r ${config.gradient} text-white`}>
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              {currentWorkspace?.logo_url ? (
                <img src={currentWorkspace.logo_url} alt={displayName} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <span className="text-white/80 font-medium">{displayName}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{config.title}</h1>
            <p className="text-white/80 text-base mb-4">{config.subtitle}</p>
            
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by title or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-11 bg-white text-foreground border-0"
                />
              </div>
              <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
                <SelectTrigger className="w-full sm:w-44 h-11 bg-white text-foreground border-0">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">All Types</SelectItem>
                  {propertyTypes.map(pt => (
                    <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-muted-foreground text-sm">
            <span className="font-semibold text-foreground">{availableProperties.length}</span> available
            {soldProperties.length > 0 && <span className="ml-1">• {soldProperties.length} recently sold</span>}
          </p>
        </div>

        {/* Available Properties Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {availableProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              config={config}
              type={type || 'commercial'}
              formatPrice={formatPrice}
              onClick={() => handlePropertyClick(property)}
              onShare={(method) => shareProperty(property, type || 'commercial', method, toast)}
              whatsappNumber={currentWorkspace?.whatsapp_number || (property.workspace_id ? workspaceWhatsApp[property.workspace_id] : null)}
            />
          ))}
        </div>

        {/* Empty State for Available */}
        {availableProperties.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Available Properties</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Recently Sold Section */}
        {soldProperties.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 bg-gradient-to-br ${config.gradient} rounded-xl flex items-center justify-center`}>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Recently Sold</h2>
                <p className="text-sm text-muted-foreground">Properties that found their perfect match</p>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {soldProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  config={config}
                  type={type || 'commercial'}
                  formatPrice={formatPrice}
                  onClick={() => handlePropertyClick(property)}
                  isSold
                  onShare={(method) => shareProperty(property, type || 'commercial', method, toast)}
                  whatsappNumber={currentWorkspace?.whatsapp_number || (property.workspace_id ? workspaceWhatsApp[property.workspace_id] : null)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        open={!!selectedProperty}
        onOpenChange={(open) => !open && setSelectedProperty(null)}
        onEnquire={handleEnquireFromModal}
        portalType={type || 'commercial'}
        gradient={config.gradient}
        accent={config.accent}
        whatsappNumber={currentWorkspace?.whatsapp_number || (selectedProperty?.workspace_id ? workspaceWhatsApp[selectedProperty.workspace_id] : null)}
      />

      {/* Enquiry Dialog */}
      <Dialog open={!!enquiryProperty} onOpenChange={(open) => !open && setEnquiryProperty(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className={`h-5 w-5 ${config.accent}`} />
              Enquire About This Property
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEnquiry} className="space-y-4">
            {enquiryProperty && (
              <div className={`p-4 rounded-xl bg-gradient-to-r ${config.gradient} text-white`}>
                <p className="font-semibold">{enquiryProperty.title}</p>
                {enquiryProperty.price && (
                  <p className="text-xl font-bold mt-1">{formatPrice(enquiryProperty.price)}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                value={enquiryName}
                onChange={(e) => setEnquiryName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={enquiryEmail}
                onChange={(e) => setEnquiryEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={enquiryPhone}
                onChange={(e) => setEnquiryPhone(e.target.value)}
                required
                placeholder="+91 98765 43210"
              />
            </div>
            <Button 
              type="submit" 
              className={`w-full bg-gradient-to-r ${config.gradient} hover:opacity-90`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
