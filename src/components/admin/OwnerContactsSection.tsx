import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Home, User, Search, MapPin, Building2, BookUser } from 'lucide-react';
import { SaveToContactBookDialog } from '@/components/contacts/SaveToContactBookDialog';

interface OwnerDetails {
  name?: string;
  phone?: string;
}

interface Property {
  id: string;
  title: string;
  address: string | null;
  price: number | null;
  status: string;
  owner_details: OwnerDetails | null;
}

interface GroupedOwner {
  name: string;
  phone: string;
  properties: Property[];
}

export function OwnerContactsSection() {
  const [owners, setOwners] = useState<GroupedOwner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<GroupedOwner | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveToContactOpen, setSaveToContactOpen] = useState(false);

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    const { data } = await supabase
      .from('properties')
      .select('id, title, address, price, status, owner_details');

    if (data) {
      // Group properties by owner phone number
      const ownerMap = new Map<string, GroupedOwner>();

      data.forEach((property) => {
        const ownerDetails = property.owner_details as unknown as OwnerDetails | null;
        const mappedProperty: Property = {
          id: property.id,
          title: property.title,
          address: property.address,
          price: property.price,
          status: property.status,
          owner_details: ownerDetails,
        };
        
        if (ownerDetails?.phone) {
          const key = ownerDetails.phone;
          if (ownerMap.has(key)) {
            ownerMap.get(key)!.properties.push(mappedProperty);
          } else {
            ownerMap.set(key, {
              name: ownerDetails.name || 'Unknown',
              phone: ownerDetails.phone,
              properties: [mappedProperty],
            });
          }
        }
      });

      setOwners(Array.from(ownerMap.values()));
    }
  };

  const filteredOwners = owners.filter((owner) =>
    owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    owner.phone.includes(searchQuery)
  );

  const formatPrice = (price: number | null) => {
    if (!price) return 'Price not set';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'sold': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'rented': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'under_offer': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Owner Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Owners List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredOwners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No owners found</p>
            </div>
          ) : (
            filteredOwners.map((owner, index) => (
              <div
                key={`${owner.phone}-${index}`}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedOwner(owner);
                  setIsModalOpen(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{owner.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {owner.phone}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  {owner.properties.length} {owner.properties.length === 1 ? 'property' : 'properties'}
                </Badge>
              </div>
            ))
          )}
        </div>

        {/* Owner Properties Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {selectedOwner?.name}'s Properties
              </DialogTitle>
            </DialogHeader>

            {selectedOwner && (
              <div className="space-y-4">
                {/* Owner Info */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${selectedOwner.phone}`}
                      className="text-primary hover:underline"
                    >
                      {selectedOwner.phone}
                    </a>
                  </div>
                </div>

                {/* Properties List */}
                <div className="space-y-3">
                  {selectedOwner.properties.map((property) => (
                    <div
                      key={property.id}
                      className="p-4 border border-border rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-foreground">
                          {property.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className={getStatusColor(property.status)}
                        >
                          {property.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {property.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {property.address}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-primary">
                        {formatPrice(property.price)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSaveToContactOpen(true)}
                  >
                    <BookUser className="h-4 w-4 mr-1.5" />
                    Save to Contacts
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {selectedOwner && (
          <SaveToContactBookDialog
            open={saveToContactOpen}
            onOpenChange={setSaveToContactOpen}
            contactName={selectedOwner.name}
            contactPhone={selectedOwner.phone}
            sourceType="owner"
            sourceId={selectedOwner.phone}
          />
        )}
      </CardContent>
    </Card>
  );
}
