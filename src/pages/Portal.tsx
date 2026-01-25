import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Building2, MapPin, Search, Bed, Bath, Maximize, Phone, Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PropertyDetailModal } from '@/components/portal/PropertyDetailModal';

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
}

interface Branch {
  id: string;
  name: string;
  city: string;
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
  rentals: {
    title: 'Rental Properties',
    subtitle: 'Find comfortable living spaces',
    gradient: 'from-orange-500 to-orange-700',
    accent: 'text-orange-500',
  },
};

interface PropertyCardProps {
  property: Property;
  config: typeof portalConfig.commercial;
  type: string;
  formatPrice: (price: number) => string;
  onClick: () => void;
  isSold?: boolean;
}

function PropertyCard({ property, config, type, formatPrice, onClick, isSold = false }: PropertyCardProps) {
  const sold = isSold || property.status === 'sold' || property.status === 'rented';
  const firstImage = property.images?.[0];

  return (
    <Card 
      className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group border-0 shadow-md ${sold ? 'opacity-75' : ''}`}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        {firstImage ? (
          <img 
            src={firstImage} 
            alt={property.title}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${sold ? 'grayscale' : ''}`}
          />
        ) : (
          <div className={`h-full bg-gradient-to-br ${config.gradient} opacity-20 flex items-center justify-center`}>
            <Building2 className="h-12 w-12 text-foreground/20" />
          </div>
        )}
        
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

        {/* Price */}
        <div className="pt-1">
          {property.price ? (
            <span className={`text-lg font-bold ${sold ? 'text-muted-foreground line-through' : config.accent}`}>
              {formatPrice(property.price)}
              {type === 'rentals' && !sold && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">Price on request</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Portal() {
  const { type } = useParams<{ type: 'commercial' | 'residential' | 'rentals' }>();
  const config = portalConfig[type || 'commercial'];
  const [properties, setProperties] = useState<Property[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [enquiryProperty, setEnquiryProperty] = useState<Property | null>(null);
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryEmail, setEnquiryEmail] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBranches();
    fetchProperties();
  }, [type, selectedBranch]);

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('*');
    if (data) setBranches(data);
  };

  const fetchProperties = async () => {
    // Use properties_public view for unauthenticated access (excludes owner_details)
    let query = supabase
      .from('properties_public')
      .select('*, property_type:property_types(name), branch:branches(name, city)')
      .eq('portal_type', type)
      .in('status', ['available', 'sold', 'rented']);

    if (selectedBranch !== 'all') {
      query = query.eq('branch_id', selectedBranch);
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
    if (!enquiryProperty) return;

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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className={`bg-gradient-to-r ${config.gradient} text-white`}>
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-white/80 font-medium">Room4Calicut</span>
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
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full sm:w-44 h-11 bg-white text-foreground border-0">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.city}</SelectItem>
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
