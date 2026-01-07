import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Building2, MapPin, Search, Bed, Bath, Maximize, Phone, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function Portal() {
  const { type } = useParams<{ type: 'commercial' | 'residential' | 'rentals' }>();
  const config = portalConfig[type || 'commercial'];
  const [properties, setProperties] = useState<Property[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
    let query = supabase
      .from('properties')
      .select('*, property_type:property_types(name), branch:branches(name, city)')
      .eq('status', 'available')
      .eq('portal_type', type);

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
      setEnquiryName('');
      setEnquiryEmail('');
      setEnquiryPhone('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className={`bg-gradient-to-r ${config.gradient} text-white`}>
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6" />
              </div>
              <span className="text-white/80 font-medium">Room4Calicut</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{config.title}</h1>
            <p className="text-white/80 text-lg mb-6">{config.subtitle}</p>
            
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by title or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white text-foreground border-0"
                />
              </div>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full sm:w-48 h-12 bg-white text-foreground border-0">
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

      {/* Properties Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredProperties.length}</span> properties available
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-0 shadow-md">
              {/* Image */}
              <div className={`h-48 bg-gradient-to-br ${config.gradient} opacity-20 flex items-center justify-center relative`}>
                <Building2 className="h-20 w-20 text-foreground/20 group-hover:scale-110 transition-transform duration-300" />
                {property.branch && (
                  <Badge className="absolute top-3 left-3 bg-white/90 text-foreground hover:bg-white">
                    {property.branch.city}
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-5 space-y-4">
                {/* Title */}
                <div>
                  <h3 className={`font-semibold text-lg text-foreground group-hover:${config.accent} transition-colors line-clamp-1`}>
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
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="line-clamp-1">{property.address}</span>
                  </p>
                )}

                {/* Description */}
                {property.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {property.description}
                  </p>
                )}

                {/* Features */}
                {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground py-2 border-y border-border/50">
                    {property.bedrooms && (
                      <span className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        {property.bedrooms} Beds
                      </span>
                    )}
                    {property.bathrooms && (
                      <span className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        {property.bathrooms} Baths
                      </span>
                    )}
                    {property.area_sqft && (
                      <span className="flex items-center gap-1">
                        <Maximize className="h-4 w-4" />
                        {property.area_sqft.toLocaleString()} sqft
                      </span>
                    )}
                  </div>
                )}

                {/* Price & CTA */}
                <div className="flex items-center justify-between pt-2">
                  {property.price && (
                    <span className={`text-2xl font-bold ${config.accent}`}>
                      {formatPrice(property.price)}
                      {type === 'rentals' && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                    </span>
                  )}
                  
                  <Dialog open={enquiryProperty?.id === property.id} onOpenChange={(open) => !open && setEnquiryProperty(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => setEnquiryProperty(property)}
                        className={`bg-gradient-to-r ${config.gradient} hover:opacity-90`}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Enquire
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Sparkles className={`h-5 w-5 ${config.accent}`} />
                          Enquire About This Property
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleEnquiry} className="space-y-4">
                        <div className={`p-4 rounded-xl bg-gradient-to-r ${config.gradient} text-white`}>
                          <p className="font-semibold">{property.title}</p>
                          {property.price && (
                            <p className="text-xl font-bold mt-1">{formatPrice(property.price)}</p>
                          )}
                        </div>
                        
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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredProperties.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Properties Found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}