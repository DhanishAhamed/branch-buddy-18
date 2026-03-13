import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';
import { AddPropertyDialog } from '@/components/properties/AddPropertyDialog';
import { Link } from 'react-router-dom';

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
    fetchProperties();
  }, [profile]);

  const fetchProperties = async () => {
    const { data: props } = await supabase
      .from('properties')
      .select('id, title, address, price')
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
      <div className="dashboard-card h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700 }} className="text-foreground">🔥 Property Hotlist</h3>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Most inquired this week</p>
          </div>
          <Link to="/properties" className="text-[11px] font-semibold" style={{ color: '#40916c' }}>
            View All →
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: '#94a3b8', fontSize: 12 }}>
            No properties yet
          </div>
        ) : (
          <div className="flex-1">
            {properties.map((prop, idx) => (
              <div
                key={prop.id}
                className="flex gap-2.5 cursor-pointer hover:opacity-75 transition-opacity"
                style={{ padding: '8px 0', borderBottom: '1px solid #f8fafb' }}
              >
                <div className="shrink-0 flex items-center justify-center text-xl" style={{ width: 44, height: 38, background: '#d8f3dc', borderRadius: 7 }}>
                  {propertyEmojis[idx] || '🏠'}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12.5, fontWeight: 700 }} className="text-foreground truncate">{prop.title}</p>
                  <p style={{ fontSize: 10.5, color: '#94a3b8' }} className="truncate">
                    {prop.address || 'Property'} · {prop.inquiryCount} inquiries
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1a4731' }}>{formatPrice(prop.price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setAddOpen(true)}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-2"
          style={{ border: '1px dashed #e2e8ed', background: '#f8fafb', borderRadius: 8, color: '#40916c', fontSize: 12, fontWeight: 600 }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Property
        </button>
      </div>

      <AddPropertyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => fetchProperties()}
      />
    </>
  );
}
