import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Home, Search, MapPin, Mail, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const ITEMS_PER_PAGE = 8;

export default function OwnersPage() {
  const [owners, setOwners] = useState<GroupedOwner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<GroupedOwner | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'properties'>('properties');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    const { data } = await supabase
      .from('properties')
      .select('id, title, address, price, status, owner_details');

    if (data) {
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

  const filteredOwners = owners
    .filter((owner) =>
      owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.phone.includes(searchQuery)
    )
    .sort((a, b) => {
      if (sortBy === 'properties') {
        return b.properties.length - a.properties.length;
      }
      return a.name.localeCompare(b.name);
    });

  const totalPages = Math.ceil(filteredOwners.length / ITEMS_PER_PAGE);
  const paginatedOwners = filteredOwners.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Property Owners</h1>
          <p className="text-muted-foreground text-sm">
            Manage and view {filteredOwners.length} registered property owners and their assets
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search owners by name, email, or registry ID"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={sortBy} onValueChange={(val: 'name' | 'properties') => setSortBy(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="properties">Properties: High to Low</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Owners Grid - optimized for tablet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {paginatedOwners.map((owner, index) => (
          <Card
            key={`${owner.phone}-${index}`}
            className="hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => {
              setSelectedOwner(owner);
              setIsModalOpen(true);
            }}
          >
            <CardContent className="p-4 md:p-5 flex flex-col items-center text-center">
              <Avatar className="h-14 w-14 md:h-16 md:w-16 mb-3">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitials(owner.name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-foreground truncate w-full">{owner.name}</h3>
              <p className="text-sm text-muted-foreground truncate w-full">{owner.phone}</p>
              
              <Badge variant="secondary" className="mt-3 flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" />
                {owner.properties.length} {owner.properties.length === 1 ? 'PROPERTY' : 'PROPERTIES'}
              </Badge>

              <div className="flex gap-2 mt-4 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://wa.me/${owner.phone.replace(/[^0-9]/g, '')}`, '_blank');
                  }}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Message
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOwner(owner);
                    setIsModalOpen(true);
                  }}
                >
                  Portfolio
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {paginatedOwners.length === 0 && (
          <div className="col-span-full">
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No owners found</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredOwners.length)} of {filteredOwners.length} Owners
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-2 text-muted-foreground">...</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Owner Properties Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {selectedOwner && getInitials(selectedOwner.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{selectedOwner?.name}</p>
                <p className="text-sm text-muted-foreground font-normal">{selectedOwner?.phone}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedOwner && (
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`tel:${selectedOwner.phone}`, '_blank')}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`https://wa.me/${selectedOwner.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>

              {/* Properties List */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {selectedOwner.properties.length} Properties
                </p>
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

              <Button
                className="w-full"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
