import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';
import { AddPropertyDialog } from '@/components/properties/AddPropertyDialog';

interface HotProperty {
  id: string;
  title: string;
  address: string | null;
  price: number | null;
  inquiryCount: number;
}

export function PropertyHotlist() {
  const [properties, setProperties] = useState<HotProperty[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.branch_id) fetchProperties();
  }, [profile]);

  const fetchProperties = async () => {
    // Get properties with their lead inquiry count
    const { data: props } = await supabase
      .from('properties')
      .select('id, title, address, price')
      .eq('branch_id', profile?.branch_id)
      .eq('status', 'available')
      .limit(10);

    if (!props) return;

    const results: HotProperty[] = [];

    for (const p of props) {
      const { count } = await supabase
        .from('lead_properties')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', p.id);

      results.push({
        id: p.id,
        title: p.title,
        address: p.address,
        price: p.price,
        inquiryCount: count || 0,
      });
    }

    results.sort((a, b) => b.inquiryCount - a.inquiryCount);
    setProperties(results.slice(0, 3));
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '₹N/A';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const propertyEmojis = ['🏠', '🏢', '🏡'];

  return (
    <>
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-foreground">Property Hotlist</h3>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">Top properties by inquiries</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 text-[12px] font-semibold text-[hsl(var(--green-accent))] hover:text-[hsl(var(--green-dark))] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Property
          </button>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-[12px]">
            No properties yet
          </div>
        ) : (
          <div>
            {properties.map((prop, idx) => (
              <div
                key={prop.id}
                className="flex gap-2.5 py-2.5 border-b border-muted/30 last:border-0 cursor-pointer hover:opacity-75 transition-opacity"
              >
                <div className="w-[52px] h-[44px] rounded-lg bg-[hsl(var(--green-pale))] flex items-center justify-center text-xl shrink-0">
                  {propertyEmojis[idx] || '🏠'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{prop.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{prop.address || 'No address'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold text-[hsl(var(--green-dark))]">{formatPrice(prop.price)}</p>
                  <p className="text-[10px] text-muted-foreground">{prop.inquiryCount} inquiries</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddPropertyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => fetchProperties()}
      />
    </>
  );
}
