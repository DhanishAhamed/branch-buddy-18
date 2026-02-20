import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, Calendar, Building2, Home, BookUser } from 'lucide-react';
import { SaveToContactBookDialog } from '@/components/contacts/SaveToContactBookDialog';

interface CustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  customer_type: string;
  notes: string | null;
  created_at: string;
  lead_id: string | null;
}

interface CustomerProperty {
  id: string;
  transaction_type: string;
  transaction_date: string | null;
  property: {
    id: string;
    title: string;
    address: string | null;
    price: number | null;
    bedrooms: number | null;
    area_sqft: number | null;
  } | null;
}

interface CustomerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
}

export function CustomerDetailModal({ open, onOpenChange, customerId }: CustomerDetailModalProps) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [properties, setProperties] = useState<CustomerProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveToContactOpen, setSaveToContactOpen] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (open && customerId) {
      fetchCustomerDetails();
    }
  }, [open, customerId]);

  const fetchCustomerDetails = async () => {
    if (!customerId) return;
    setLoading(true);

    const [customerRes, propsRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).single(),
      supabase
        .from('customer_properties')
        .select('id, transaction_type, transaction_date, property:properties(id, title, address, price, bedrooms, area_sqft)')
        .eq('customer_id', customerId),
    ]);

    if (customerRes.data) setCustomer(customerRes.data as CustomerDetail);
    if (propsRes.data) setProperties(propsRes.data as unknown as CustomerProperty[]);
    setLoading(false);
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {loading || !customer ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {customer.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-lg">{customer.name}</SheetTitle>
                  <Badge variant="secondary" className="capitalize mt-1">
                    {customer.customer_type}
                  </Badge>
                </div>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setSaveToContactOpen(true)}
                >
                  <BookUser className="h-4 w-4 mr-1.5" />
                  Save to Contact Book
                </Button>
              )}
            </SheetHeader>

            <Separator />

            {/* Contact Info */}
            <div className="py-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Customer since {new Date(customer.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <Separator />

            {/* Properties */}
            <div className="py-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Properties ({properties.length})
              </h3>
              {properties.length === 0 ? (
                <p className="text-sm text-muted-foreground">No properties linked yet.</p>
              ) : (
                <div className="space-y-3">
                  {properties.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {cp.property?.title || 'Unknown Property'}
                          </p>
                          {cp.property?.address && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {cp.property.address}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-xs capitalize">
                              {cp.transaction_type}
                            </Badge>
                            {cp.property?.price && (
                              <span className="text-xs font-medium text-foreground">
                                {formatPrice(cp.property.price)}
                              </span>
                            )}
                            {cp.property?.bedrooms && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Home className="h-3 w-3" />
                                {cp.property.bedrooms} BHK
                              </span>
                            )}
                          </div>
                          {cp.transaction_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(cp.transaction_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {customer.notes && (
              <>
                <Separator />
                <div className="py-4 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                  <p className="text-sm text-muted-foreground">{customer.notes}</p>
                </div>
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>

    {customer && (
      <SaveToContactBookDialog
        open={saveToContactOpen}
        onOpenChange={setSaveToContactOpen}
        contactName={customer.name}
        contactPhone={customer.phone}
        contactEmail={customer.email}
        sourceType="customer"
        sourceId={customer.id}
      />
    )}
    </>
  );
}
