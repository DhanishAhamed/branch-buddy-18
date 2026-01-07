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
import { Building2, MapPin, Search, Phone, Mail, User } from 'lucide-react';
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

export default function Portal() {
  const { type } = useParams<{ type: 'commercial' | 'residential' | 'rentals' }>();
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

  const portalTitles: Record<string, string> = {
    commercial: 'Commercial Properties',
    residential: 'Residential Properties',
    rentals: 'Rental Properties',
  };

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
        title: 'Enquiry Submitted!',
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
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Room4Calicut</h1>
                <p className="text-sm text-muted-foreground">{portalTitles[type || 'commercial']}</p>
              </div>
            </div>
            
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-40">
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
      </header>

      {/* Search */}
      <div className="container mx-auto px-4 py-6">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </div>

      {/* Properties Grid */}
      <div className="container mx-auto px-4 pb-12">
        <p className="text-muted-foreground mb-4">
          {filteredProperties.length} properties available
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                <Building2 className="h-20 w-20 text-primary/40" />
              </div>
              <CardContent className="p-5">
                <h3 className="font-semibold text-lg text-foreground mb-2">{property.title}</h3>
                
                {property.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                    <MapPin className="h-4 w-4" />
                    {property.address}
                  </p>
                )}

                {property.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {property.description}
                  </p>
                )}

                <div className="flex items-center justify-between mb-4">
                  {property.price && (
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(property.price)}
                    </span>
                  )}
                  {property.area_sqft && (
                    <span className="text-sm text-muted-foreground">
                      {property.area_sqft.toLocaleString()} sqft
                    </span>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap mb-4">
                  {property.property_type && (
                    <Badge variant="outline">{property.property_type.name}</Badge>
                  )}
                  {property.branch && (
                    <Badge variant="secondary">{property.branch.city}</Badge>
                  )}
                </div>

                <Dialog open={enquiryProperty?.id === property.id} onOpenChange={(open) => !open && setEnquiryProperty(null)}>
                  <DialogTrigger asChild>
                    <Button className="w-full" onClick={() => setEnquiryProperty(property)}>
                      Enquire Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enquire About This Property</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEnquiry} className="space-y-4">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-medium">{property.title}</p>
                        {property.price && (
                          <p className="text-primary font-bold">{formatPrice(property.price)}</p>
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
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Properties Found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
