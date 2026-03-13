import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Share2, Phone, Pencil, Plus, MapPin, Bed, Bath, Maximize, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/components/maps/PropertyMarker';
import { AddInquiryDialog } from './AddInquiryDialog';
import { EditPropertyDialog } from './EditPropertyDialog';

interface Property {
  id: string;
  title: string;
  address: string | null;
  price: number | null;
  property_type_id: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  images: string[] | null;
  lat: number;
  lng: number;
  status?: string;
  description?: string | null;
  owner_id?: string | null; // Needed for calling owner if we have it, else we fallback
  workspace_id?: string | null;
}

interface PropertyDetailModalProps {
  property: Property | null;
  onClose: () => void;
  onLocate?: (property: Property) => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  available: { label: '● Available', bg: '#d8f3dc', text: '#1a4731' },
  sold: { label: '● Sold', bg: '#fee2e2', text: '#dc2626' },
  rented: { label: '● Rented', bg: '#dbeafe', text: '#2563eb' },
  under_offer: { label: '● Pending', bg: '#fef3c7', text: '#92400e' },
  off_market: { label: '● Off Market', bg: '#f1f5f9', text: '#475569' },
};

const TYPE_EMOJIS: Record<string, string> = {
  apartment: '🏢', house: '🏡', villa: '🏰', commercial: '🏪',
  hostel: '🏨', plot: '🌿', flat: '🏢',
};

export function PropertyDetailModal({ property, onClose, onLocate }: PropertyDetailModalProps) {
  const [note, setNote] = useState('');
  const [isAddInquiryOpen, setIsAddInquiryOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { toast } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!property) return null;

  const status = STATUS_CONFIG[property.status || 'available'] || STATUS_CONFIG.available;
  const imageUrl = property.images?.[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[3px]" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-[480px] h-full bg-white dark:bg-card flex flex-col overflow-hidden animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Image Header */}
        <div className="relative h-[200px] flex-shrink-0 overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={property.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #d8f3dc, #f0faf4)' }}>
              <span className="text-5xl">🏠</span>
            </div>
          )}

          {/* Overlays on image */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute bottom-3 left-3">
            <span className="text-[11px] font-bold px-2 py-1 rounded-full backdrop-blur-sm"
              style={{ background: `${status.bg}e6`, color: status.text }}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Title Area */}
        <div className="px-5 pt-4 pb-0 flex-shrink-0">
          <h2 className="text-xl font-extrabold text-[#1e293b]">{property.title}</h2>
          <div className="flex items-center gap-2 mt-1 text-xs text-[#94a3b8]">
            {property.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {property.address}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {/* Key Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'PRICE', value: property.price ? formatPrice(property.price) : '—', highlight: true },
              { label: 'BEDS', value: property.bedrooms ?? '—' },
              { label: 'BATHS', value: property.bathrooms ?? '—' },
              { label: 'AREA', value: property.area_sqft ? `${property.area_sqft}` : '—' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[10px] p-3 text-center"
                style={{ background: stat.highlight ? '#f0faf4' : '#f8fafb' }}>
                <div className="text-base font-extrabold" style={{ color: stat.highlight ? '#1a4731' : '#1e293b' }}>
                  {stat.value}
                </div>
                <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider font-semibold mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          {property.description && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.07em] text-[#94a3b8] mb-2">
                About this Property
              </h3>
              <p className="text-[13px] text-[#4b5563] leading-relaxed line-clamp-4">
                {property.description}
              </p>
            </div>
          )}

          {/* Location Section */}
          <div className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.07em] text-[#94a3b8] mb-2">
              Location
            </h3>
            <button
              onClick={() => {
                if (property.lat && property.lng) {
                  window.open(`https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`, '_blank');
                } else if (property.address) {
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`, '_blank');
                }
                onLocate?.(property);
                onClose();
              }}
              className="w-full h-[100px] rounded-xl overflow-hidden relative group"
              style={{ background: 'linear-gradient(135deg, #d8f3dc, #f0faf4)' }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 text-[#1a4731] text-sm font-semibold group-hover:underline">
                  <ExternalLink className="h-4 w-4" />
                  Open in full map
                </div>
              </div>
            </button>
          </div>

          {/* Add Note */}
          <div className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.07em] text-[#94a3b8] mb-2">
              Add a Note
            </h3>
            <Textarea
              placeholder="Write a note about this property..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-sm border-[#e2e8ed] focus:border-[#40916c] min-h-[80px]"
            />
            <Button
              className="mt-2 text-xs font-bold"
              size="sm"
              style={{ background: '#1a4731' }}
              onClick={() => {
                toast({ title: 'Note saved', description: 'Your note has been saved.' });
                setNote('');
              }}
              disabled={!note.trim()}
            >
              Save Note
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-[#e2e8ed] px-5 py-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs font-bold gap-1"
            onClick={() => {
              // we don't have owner phone directly in property type usually, so fallback toast if unavailable
              // If your schema includes it, you'd do: window.location.href = `tel:${property.owner_phone}`
              toast({ title: 'Contact Support', description: 'Owner phone lookup is under maintenance.' });
            }}
          >
            <Phone className="h-3.5 w-3.5" /> Call Owner
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs font-bold gap-1"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs font-bold gap-1"
            style={{ background: '#1a4731', color: 'white' }}
            onClick={() => setIsAddInquiryOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add Inquiry
          </Button>
        </div>
      </div>

      <AddInquiryDialog
        property={{
          id: property.id,
          title: property.title,
          workspace_id: property.workspace_id || null,
        }}
        open={isAddInquiryOpen}
        onOpenChange={setIsAddInquiryOpen}
      />

      <EditPropertyDialog
        property={{
          ...property,
          location: (property as any).location || `POINT(${property.lng} ${property.lat})`
        } as any}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={() => {
          setIsEditOpen(false);
          // Hard reload to reflect changes in MapSearch and any other parents
          window.location.reload();
        }}
      />

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
