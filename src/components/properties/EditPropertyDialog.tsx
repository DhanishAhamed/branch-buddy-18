import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PropertyLocationPicker } from './PropertyLocationPicker';
import { X, Image as ImageIcon, Video } from 'lucide-react';

interface PropertyType {
  id: string;
  name: string;
  portal_type: string;
}

interface Property {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  price: number | null;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type_id: string | null;
  portal_type: string | null;
  status: string;
  images: string[] | null;
  location?: unknown;
  youtube_url?: string | null;
}

interface EditPropertyDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPropertyDialog({ property, open, onOpenChange, onSuccess }: EditPropertyDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [propertyTypeId, setPropertyTypeId] = useState('');
  const [status, setStatus] = useState('available');
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [newVideos, setNewVideos] = useState<File[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPropertyTypes();
  }, []);

  useEffect(() => {
    if (property && open) {
      setTitle(property.title);
      setDescription(property.description || '');
      setAddress(property.address || '');
      setPrice(property.price?.toString() || '');
      setAreaSqft(property.area_sqft?.toString() || '');
      setBedrooms(property.bedrooms?.toString() || '');
      setBathrooms(property.bathrooms?.toString() || '');
      setPropertyTypeId(property.property_type_id || '');
      setStatus(property.status);
      setExistingImages(property.images || []);
      setYoutubeUrl(property.youtube_url || '');
      
      // Parse location
      if (property.location) {
        const match = property.location?.toString().match(/POINT\(([^ ]+) ([^)]+)\)/);
        if (match) {
          setLocation({ lng: parseFloat(match[1]), lat: parseFloat(match[2]) });
        }
      }
    }
  }, [property, open]);

  const fetchPropertyTypes = async () => {
    const { data } = await supabase.from('property_types').select('*');
    if (data) setPropertyTypes(data);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    setNewImages(prev => [...prev, ...imageFiles]);
    
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    setNewVideos(prev => [...prev, ...videoFiles]);
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setNewVideos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (propertyId: string) => {
    const uploadedUrls: string[] = [];
    
    for (const image of newImages) {
      const fileName = `${propertyId}/${Date.now()}-${image.name}`;
      const { error } = await supabase.storage
        .from('property-media')
        .upload(fileName, image);
      
      if (!error) {
        const { data: urlData } = supabase.storage
          .from('property-media')
          .getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    for (const video of newVideos) {
      const fileName = `${propertyId}/${Date.now()}-${video.name}`;
      const { error } = await supabase.storage
        .from('property-media')
        .upload(fileName, video);
      
      if (!error) {
        const { data: urlData } = supabase.storage
          .from('property-media')
          .getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;

    setIsSubmitting(true);
    
    const selectedType = propertyTypes.find(t => t.id === propertyTypeId);
    const locationPoint = location 
      ? `POINT(${location.lng} ${location.lat})`
      : null;
    
    // Upload new files
    const newUrls = await uploadFiles(property.id);
    const allImages = [...existingImages, ...newUrls];
    
    const { error } = await supabase
      .from('properties')
      .update({
        title,
        description: description || null,
        address: address || null,
        price: price ? parseFloat(price) : null,
        area_sqft: areaSqft ? parseFloat(areaSqft) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        property_type_id: propertyTypeId || null,
        portal_type: (selectedType?.portal_type as 'commercial' | 'residential' | 'rentals') || null,
        status: status as any,
        location: locationPoint,
        images: allImages.length > 0 ? allImages : null,
        youtube_url: youtubeUrl || null,
      })
      .eq('id', property.id);

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update property',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Property updated successfully',
      });
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-type">Property Type</Label>
              <Select value={propertyTypeId} onValueChange={setPropertyTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="under_offer">Under Offer</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="off_market">Off Market</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">Price (₹)</Label>
              <Input
                id="edit-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-area">Area (sqft)</Label>
              <Input
                id="edit-area"
                type="number"
                value={areaSqft}
                onChange={(e) => setAreaSqft(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bedrooms">Bedrooms</Label>
              <Input
                id="edit-bedrooms"
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bathrooms">Bathrooms</Label>
              <Input
                id="edit-bathrooms"
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="space-y-2">
              <Label>Current Images</Label>
              <div className="flex flex-wrap gap-2">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Image Upload */}
          <div className="space-y-2">
            <Label>Add More Images</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                id="edit-image-upload"
              />
              <label 
                htmlFor="edit-image-upload" 
                className="flex flex-col items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm">Click to upload images</span>
              </label>
            </div>
            {newImagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newImagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img src={preview} alt="" className="w-20 h-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* YouTube Video Link */}
          <div className="space-y-2">
            <Label htmlFor="edit-youtube-url">YouTube Video Link</Label>
            <Input
              id="edit-youtube-url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          {/* Video Upload */}
          <div className="space-y-2">
            <Label>Add Videos</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoChange}
                className="hidden"
                id="edit-video-upload"
              />
              <label 
                htmlFor="edit-video-upload" 
                className="flex flex-col items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <Video className="h-8 w-8" />
                <span className="text-sm">Click to upload videos</span>
              </label>
            </div>
            {newVideos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newVideos.map((video, index) => (
                  <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                    <Video className="h-4 w-4" />
                    <span className="text-sm truncate max-w-[150px]">{video.name}</span>
                    <button type="button" onClick={() => removeVideo(index)} className="text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location Picker */}
          <PropertyLocationPicker value={location} onChange={setLocation} />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
