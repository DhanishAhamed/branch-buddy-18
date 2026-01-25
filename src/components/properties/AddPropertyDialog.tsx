import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { PropertyLocationPicker } from './PropertyLocationPicker';
import { Upload, X, Image as ImageIcon, Video } from 'lucide-react';

interface PropertyType {
  id: string;
  name: string;
  portal_type: string;
}

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddPropertyDialog({ open, onOpenChange, onSuccess }: AddPropertyDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [propertyTypeId, setPropertyTypeId] = useState('');
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const { profile, user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  useEffect(() => {
    fetchPropertyTypes();
  }, []);

  const fetchPropertyTypes = async () => {
    const { data } = await supabase.from('property_types').select('*');
    if (data) setPropertyTypes(data);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...imageFiles]);
    
    // Create previews
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    setVideos(prev => [...prev, ...videoFiles]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (propertyId: string) => {
    const uploadedUrls: string[] = [];
    
    // Upload images
    for (const image of images) {
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

    // Upload videos
    for (const video of videos) {
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
    if (!profile?.branch_id) {
      toast({
        title: 'Error',
        description: 'No branch assigned. Please contact admin.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    const selectedType = propertyTypes.find(t => t.id === propertyTypeId);
    
    // Prepare location as PostGIS point
    const locationPoint = location 
      ? `POINT(${location.lng} ${location.lat})`
      : null;
    
    const { data: property, error } = await supabase.from('properties').insert([{
      title,
      description: description || null,
      address: address || null,
      price: price ? parseFloat(price) : null,
      area_sqft: areaSqft ? parseFloat(areaSqft) : null,
      bedrooms: bedrooms ? parseInt(bedrooms) : null,
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      property_type_id: propertyTypeId || null,
      portal_type: (selectedType?.portal_type as 'commercial' | 'residential' | 'rentals') || null,
      branch_id: profile.branch_id,
      created_by: user?.id,
      location: locationPoint,
      workspace_id: activeWorkspace?.id || null,
    }]).select().single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add property',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    // Upload media files
    if (images.length > 0 || videos.length > 0) {
      const mediaUrls = await uploadFiles(property.id);
      if (mediaUrls.length > 0) {
        await supabase
          .from('properties')
          .update({ images: mediaUrls })
          .eq('id', property.id);
      }
    }

    setIsSubmitting(false);
    toast({
      title: 'Success',
      description: 'Property added successfully',
    });
    onSuccess();
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAddress('');
    setPrice('');
    setAreaSqft('');
    setBedrooms('');
    setBathrooms('');
    setPropertyTypeId('');
    setLocation(null);
    setImages([]);
    setVideos([]);
    setImagePreviews([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Property Type</Label>
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
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area (sqft)</Label>
              <Input
                id="area"
                type="number"
                value={areaSqft}
                onChange={(e) => setAreaSqft(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Images</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label 
                htmlFor="image-upload" 
                className="flex flex-col items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm">Click to upload images</span>
              </label>
            </div>
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img src={preview} alt="" className="w-20 h-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Upload */}
          <div className="space-y-2">
            <Label>Videos</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoChange}
                className="hidden"
                id="video-upload"
              />
              <label 
                htmlFor="video-upload" 
                className="flex flex-col items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <Video className="h-8 w-8" />
                <span className="text-sm">Click to upload videos</span>
              </label>
            </div>
            {videos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {videos.map((video, index) => (
                  <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                    <Video className="h-4 w-4" />
                    <span className="text-sm truncate max-w-[150px]">{video.name}</span>
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      className="text-destructive"
                    >
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
              {isSubmitting ? 'Adding...' : 'Add Property'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
