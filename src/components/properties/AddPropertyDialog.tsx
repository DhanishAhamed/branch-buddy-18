import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Upload, X, Image as ImageIcon, Video, User, Phone, Search, AlertTriangle } from 'lucide-react';

interface OwnerSuggestion {
  name: string;
  phone: string;
  propertyCount: number;
}

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
  // Owner details
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerSuggestions, setOwnerSuggestions] = useState<OwnerSuggestion[]>([]);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [duplicateOwnerWarning, setDuplicateOwnerWarning] = useState<string | null>(null);
  const ownerDropdownRef = useRef<HTMLDivElement>(null);
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

  const searchOwners = useCallback(async (query: string) => {
    if (query.length < 2) {
      setOwnerSuggestions([]);
      setShowOwnerDropdown(false);
      return;
    }

    const { data } = await supabase
      .from('properties')
      .select('owner_details')
      .not('owner_details', 'is', null);

    if (data) {
      const ownersMap = new Map<string, OwnerSuggestion>();
      data.forEach((p) => {
        const details = p.owner_details as { name?: string; phone?: string } | null;
        if (!details?.phone) return;
        const key = details.phone;
        const existing = ownersMap.get(key);
        if (existing) {
          existing.propertyCount++;
        } else {
          ownersMap.set(key, {
            name: details.name || '',
            phone: details.phone,
            propertyCount: 1,
          });
        }
      });

      const lowerQuery = query.toLowerCase();
      const filtered = Array.from(ownersMap.values()).filter(
        (o) =>
          o.name.toLowerCase().includes(lowerQuery) ||
          o.phone.includes(query)
      );
      setOwnerSuggestions(filtered.slice(0, 5));
      setShowOwnerDropdown(filtered.length > 0);
    }
  }, []);

  const checkDuplicatePhone = useCallback(async (phone: string) => {
    if (phone.length < 5) {
      setDuplicateOwnerWarning(null);
      return;
    }
    const { data } = await supabase
      .from('properties')
      .select('title, owner_details')
      .not('owner_details', 'is', null);

    if (data) {
      const matches = data.filter((p) => {
        const details = p.owner_details as { phone?: string } | null;
        return details?.phone === phone;
      });
      if (matches.length > 0) {
        setDuplicateOwnerWarning(
          `This phone number already exists for ${matches.length} propert${matches.length > 1 ? 'ies' : 'y'}`
        );
      } else {
        setDuplicateOwnerWarning(null);
      }
    }
  }, []);

  const handleOwnerNameChange = (value: string) => {
    setOwnerName(value);
    searchOwners(value);
  };

  const handleOwnerPhoneChange = (value: string) => {
    setOwnerPhone(value);
    searchOwners(value);
    checkDuplicatePhone(value);
  };

  const selectOwner = (owner: OwnerSuggestion) => {
    setOwnerName(owner.name);
    setOwnerPhone(owner.phone);
    setShowOwnerDropdown(false);
    setDuplicateOwnerWarning(
      `This owner already has ${owner.propertyCount} propert${owner.propertyCount > 1 ? 'ies' : 'y'}`
    );
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
    
    // Prepare owner details
    const ownerDetails = (ownerName || ownerPhone) ? {
      name: ownerName || null,
      phone: ownerPhone || null,
    } : {};

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
      owner_details: ownerDetails,
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
    setOwnerName('');
    setOwnerPhone('');
    setOwnerSuggestions([]);
    setShowOwnerDropdown(false);
    setDuplicateOwnerWarning(null);
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

          {/* Owner Details Section */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30" ref={ownerDropdownRef}>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-4 w-4 text-primary" />
              Owner Details
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label htmlFor="ownerName">Owner Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerName"
                    value={ownerName}
                    onChange={(e) => handleOwnerNameChange(e.target.value)}
                    onFocus={() => ownerSuggestions.length > 0 && setShowOwnerDropdown(true)}
                    placeholder="Search or enter name"
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                {showOwnerDropdown && ownerSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {ownerSuggestions.map((owner, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between gap-2 text-sm"
                        onClick={() => selectOwner(owner)}
                      >
                        <div>
                          <p className="font-medium text-foreground">{owner.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{owner.phone}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {owner.propertyCount} prop.
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerPhone">Owner Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerPhone"
                    value={ownerPhone}
                    onChange={(e) => handleOwnerPhoneChange(e.target.value)}
                    placeholder="Enter phone number"
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
            {duplicateOwnerWarning && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded-md">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {duplicateOwnerWarning}
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
