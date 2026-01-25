import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Phone, 
  X,
  Building2,
  Sparkles
} from 'lucide-react';

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
  status?: string;
  property_type: { name: string } | null;
  branch: { name: string; city: string } | null;
}

interface PropertyDetailModalProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnquire: (property: Property) => void;
  portalType: string;
  gradient: string;
  accent: string;
}

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Placeholder images for properties without images (Unsplash real estate photos)
const placeholderImages = {
  commercial: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&h=600&fit=crop',
  ],
  residential: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
  ],
  rentals: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&h=600&fit=crop',
  ],
};

// Get placeholder images based on property ID and portal type
const getPlaceholderImages = (propertyId: string, portalType: string): string[] => {
  const images = placeholderImages[portalType as keyof typeof placeholderImages] || placeholderImages.residential;
  // Return 3 consistent images based on property ID
  const startIndex = propertyId.charCodeAt(0) % images.length;
  return [
    images[startIndex],
    images[(startIndex + 1) % images.length],
    images[(startIndex + 2) % images.length],
  ];
};

export function PropertyDetailModal({ 
  property, 
  open, 
  onOpenChange, 
  onEnquire,
  portalType,
  gradient,
  accent
}: PropertyDetailModalProps) {
  const [currentImage, setCurrentImage] = useState(0);

  if (!property) return null;

  // Use uploaded images if available, otherwise use placeholder images
  const images = property.images && property.images.length > 0 
    ? property.images 
    : getPlaceholderImages(property.id, portalType);
  const isSold = property.status === 'sold' || property.status === 'rented';

  const nextImage = () => setCurrentImage((c) => (c + 1) % images.length);
  const prevImage = () => setCurrentImage((c) => (c - 1 + images.length) % images.length);

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
    if (price >= 1000) return `₹${(price / 1000).toFixed(0)}K`;
    return `₹${price.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
          {/* Left Side - Image Gallery */}
          <div className="lg:w-3/5 relative bg-muted">
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 left-4 z-20 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Sold/Rented Badge */}
            {isSold && (
              <div className="absolute top-4 right-4 z-20">
                <Badge className="bg-destructive text-destructive-foreground text-sm px-3 py-1">
                  {property.status === 'sold' ? 'SOLD OUT' : 'RENTED'}
                </Badge>
              </div>
            )}

            <div className="relative h-64 lg:h-full">
              <img 
                src={images[currentImage]} 
                alt={property.title}
                className={`w-full h-full object-cover ${isSold ? 'opacity-70' : ''}`}
              />
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentImage ? 'bg-foreground' : 'bg-foreground/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Details */}
          <div className="lg:w-2/5 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-bold text-foreground">{property.title}</h2>
                </div>
                
                {property.property_type && (
                  <Badge variant="outline" className="mt-2">
                    {property.property_type.name}
                  </Badge>
                )}

                {property.branch && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {property.branch.city}
                  </p>
                )}
              </div>

              {/* Price */}
              {property.price && (
                <div className={`text-3xl font-bold ${accent}`}>
                  {formatPrice(property.price)}
                  {portalType === 'rentals' && (
                    <span className="text-base font-normal text-muted-foreground">/month</span>
                  )}
                </div>
              )}

              {/* Features */}
              {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
                  {property.bedrooms && (
                    <div className="text-center">
                      <Bed className="h-5 w-5 mx-auto text-muted-foreground" />
                      <p className="font-semibold mt-1">{property.bedrooms}</p>
                      <p className="text-xs text-muted-foreground">Bedrooms</p>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="text-center">
                      <Bath className="h-5 w-5 mx-auto text-muted-foreground" />
                      <p className="font-semibold mt-1">{property.bathrooms}</p>
                      <p className="text-xs text-muted-foreground">Bathrooms</p>
                    </div>
                  )}
                  {property.area_sqft && (
                    <div className="text-center">
                      <Maximize className="h-5 w-5 mx-auto text-muted-foreground" />
                      <p className="font-semibold mt-1">{property.area_sqft.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Sq. Ft.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Address */}
              {property.address && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Location</h3>
                  <p className="text-muted-foreground flex items-start gap-2">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    {property.address}
                  </p>
                </div>
              )}

              {/* Description */}
              {property.description && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">About this property</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{property.description}</p>
                </div>
              )}

              {/* CTA */}
              <div className="pt-4 space-y-3">
                {isSold ? (
                  <Button disabled className="w-full" size="lg">
                    {property.status === 'sold' ? 'Sold Out' : 'Already Rented'}
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => onEnquire(property)}
                      className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90`}
                      size="lg"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Enquire Now
                    </Button>
                    
                    {/* WhatsApp Button */}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Hi! I'm interested in this ${portalType} property:\n\n` +
                        `🏠 ${property.title}\n` +
                        `💰 ${property.price ? (property.price >= 10000000 ? '₹' + (property.price / 10000000).toFixed(1) + 'Cr' : property.price >= 100000 ? '₹' + (property.price / 100000).toFixed(0) + 'L' : '₹' + property.price.toLocaleString()) : 'Price on request'}${portalType === 'rentals' ? '/month' : ''}\n` +
                        `📍 ${property.address || property.branch?.city || 'Location not specified'}\n\n` +
                        `Please share more details.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-md bg-[#25D366] hover:bg-[#128C7E] text-white font-medium transition-colors"
                    >
                      <WhatsAppIcon className="h-5 w-5" />
                      Chat on WhatsApp
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
