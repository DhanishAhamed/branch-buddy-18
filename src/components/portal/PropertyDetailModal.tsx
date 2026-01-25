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

  const images = property.images || [];
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

            {images.length > 0 ? (
              <>
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
              </>
            ) : (
              <div className={`h-64 lg:h-full flex items-center justify-center bg-gradient-to-br ${gradient} opacity-20`}>
                <Building2 className="h-24 w-24 text-foreground/20" />
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
              <div className="pt-4">
                {isSold ? (
                  <Button disabled className="w-full" size="lg">
                    {property.status === 'sold' ? 'Sold Out' : 'Already Rented'}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => onEnquire(property)}
                    className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90`}
                    size="lg"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Enquire Now
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
