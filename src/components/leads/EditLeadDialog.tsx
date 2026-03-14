import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { X, Plus } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  pipeline: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  site_visit_time: string | null;
  assigned_to: string | null;
  interested_places: string[] | null;
  property_type: string | null;
  customer_type: string | null;
  bhk_options: string[] | null;
  budget_min: number | null;
  budget_max: number | null;
  furnishing: string | null;
  enquiry_date: string | null;
  expected_purchase_date: string | null;
}

interface EditLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lead: Lead;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

const BHK_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];
const FURNISHING_OPTIONS = ['Furnished', 'Semi-Furnished', 'Unfurnished'];
const CUSTOMER_TYPES = ['Family', 'Bachelor', 'Couple'];
const PROPERTY_TYPES = ['Apartment', 'Villa', 'Plot', 'Commercial', 'Penthouse', 'Row House', 'Studio'];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/;

export function EditLeadDialog({ open, onOpenChange, onSuccess, lead }: EditLeadDialogProps) {
  const [name, setName] = useState(lead.name || '');
  const [email, setEmail] = useState(lead.email || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [source, setSource] = useState(lead.source || 'direct');
  const [interestedPlaces, setInterestedPlaces] = useState<string[]>(lead.interested_places || []);
  const [placeInput, setPlaceInput] = useState('');
  const [propertyType, setPropertyType] = useState(lead.property_type || '');
  const [customerType, setCustomerType] = useState(lead.customer_type || '');
  const [selectedBhk, setSelectedBhk] = useState<string[]>(lead.bhk_options || []);
  const [budgetMin, setBudgetMin] = useState(lead.budget_min ? String(lead.budget_min) : '');
  const [budgetMax, setBudgetMax] = useState(lead.budget_max ? String(lead.budget_max) : '');
  const [furnishing, setFurnishing] = useState(lead.furnishing || '');
  const [enquiryDate, setEnquiryDate] = useState(lead.enquiry_date ? lead.enquiry_date.split('T')[0] : '');
  const [expectedPurchaseDate, setExpectedPurchaseDate] = useState(lead.expected_purchase_date ? lead.expected_purchase_date.split('T')[0] : '');
  const [extraNote, setExtraNote] = useState(lead.notes || '');
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to || '');
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');

  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const { profile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchStaff();
      setDuplicateError('');

      // Reset state to current lead when modal opens
      setName(lead.name || '');
      setEmail(lead.email || '');
      setPhone(lead.phone || '');
      setSource(lead.source || 'direct');
      setInterestedPlaces(lead.interested_places || []);
      setPropertyType(lead.property_type || '');
      setCustomerType(lead.customer_type || '');
      setSelectedBhk(lead.bhk_options || []);
      setBudgetMin(lead.budget_min ? String(lead.budget_min) : '');
      setBudgetMax(lead.budget_max ? String(lead.budget_max) : '');
      setFurnishing(lead.furnishing || '');
      setEnquiryDate(lead.enquiry_date ? lead.enquiry_date.split('T')[0] : '');
      setExpectedPurchaseDate(lead.expected_purchase_date ? lead.expected_purchase_date.split('T')[0] : '');
      setExtraNote(lead.notes || '');
      setAssignedTo(lead.assigned_to || '');
    }
  }, [open, lead]);

  const fetchStaff = async () => {
    const { data } = await supabase.from('profiles').select('user_id, full_name');
    if (data) setStaffProfiles(data);
  };

  const validateEmail = (val: string) => {
    if (val && !emailRegex.test(val)) {
      setEmailError('Invalid email format');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePhone = (val: string) => {
    if (val && !phoneRegex.test(val)) {
      setPhoneError('Invalid phone format (7-15 digits)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const addPlace = () => {
    const trimmed = placeInput.trim();
    if (trimmed && !interestedPlaces.includes(trimmed)) {
      setInterestedPlaces([...interestedPlaces, trimmed]);
      setPlaceInput('');
    }
  };

  const removePlace = (place: string) => {
    setInterestedPlaces(interestedPlaces.filter(p => p !== place));
  };

  const toggleBhk = (bhk: string) => {
    setSelectedBhk(prev =>
      prev.includes(bhk) ? prev.filter(b => b !== bhk) : [...prev, bhk]
    );
  };

  const checkDuplicate = async (leadName: string): Promise<boolean> => {
    if (leadName.trim().toLowerCase() === lead.name.toLowerCase()) return false;

    const trimmedName = leadName.trim().toLowerCase();
    const { data } = await supabase
      .from('leads')
      .select('id, name')
      .ilike('name', trimmedName)
      .neq('id', lead.id);

    if (data && data.length > 0) {
      setDuplicateError(`Lead already exists in CRM with this name "${data[0].name}"`);
      return true;
    }
    setDuplicateError('');
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeWorkspace?.id) {
      toast({ title: 'Error', description: 'No workspace selected. Please select a workspace.', variant: 'destructive' });
      return;
    }

    const emailValid = validateEmail(email);
    const phoneValid = validatePhone(phone);
    if (!emailValid || !phoneValid) return;

    setIsSubmitting(true);

    // Check for duplicate
    const isDuplicate = await checkDuplicate(name);
    if (isDuplicate) {
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from('leads').update({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      source,
      notes: extraNote.trim() || null,
      assigned_to: assignedTo || null,
      interested_places: interestedPlaces.length > 0 ? interestedPlaces : [],
      property_type: propertyType || null,
      customer_type: customerType || null,
      bhk_options: selectedBhk.length > 0 ? selectedBhk : [],
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      furnishing: furnishing || null,
      enquiry_date: enquiryDate || null,
      expected_purchase_date: expectedPurchaseDate || null,
    }).eq('id', lead.id);


    setIsSubmitting(false);

    if (error) {
      toast({ title: 'Error', description: 'Failed to Save Changes', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Lead updated successfully' });
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh] px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Duplicate Error */}
            {duplicateError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {duplicateError}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => { setName(e.target.value); setDuplicateError(''); }}
                required
                maxLength={100}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
                maxLength={255}
              />
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); validatePhone(e.target.value); }}
                placeholder="+91 9876543210"
                maxLength={15}
              />
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="portal">Portal</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assign Salesperson */}
            <div className="space-y-1.5">
              <Label>Assign Salesperson</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Select salesperson" /></SelectTrigger>
                <SelectContent>
                  {staffProfiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Interested Places */}
            <div className="space-y-1.5">
              <Label>Interested Places</Label>
              <div className="flex gap-2">
                <Input
                  value={placeInput}
                  onChange={(e) => setPlaceInput(e.target.value)}
                  placeholder="e.g. Baner, Wakad"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPlace(); } }}
                  maxLength={100}
                />
                <Button type="button" variant="outline" size="icon" onClick={addPlace} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {interestedPlaces.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {interestedPlaces.map(place => (
                    <Badge key={place} variant="secondary" className="gap-1">
                      {place}
                      <button type="button" onClick={() => removePlace(place)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Property Type */}
            <div className="space-y-1.5">
              <Label>Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Type */}
            <div className="space-y-1.5">
              <Label>Customer Type</Label>
              <Select value={customerType} onValueChange={setCustomerType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* BHK Options */}
            <div className="space-y-1.5">
              <Label>BHK Options</Label>
              <div className="flex flex-wrap gap-2">
                {BHK_OPTIONS.map(bhk => (
                  <Badge
                    key={bhk}
                    variant={selectedBhk.includes(bhk) ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => toggleBhk(bhk)}
                  >
                    {bhk}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-1.5">
              <Label>Budget (₹)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  min={0}
                />
                <span className="flex items-center text-muted-foreground">–</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  min={0}
                />
              </div>
            </div>

            {/* Furnishing */}
            <div className="space-y-1.5">
              <Label>Furnishing</Label>
              <Select value={furnishing} onValueChange={setFurnishing}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {FURNISHING_OPTIONS.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Enquiry Date</Label>
                <Input type="date" value={enquiryDate} onChange={(e) => setEnquiryDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Expected Purchase Date</Label>
                <Input type="date" value={expectedPurchaseDate} onChange={(e) => setExpectedPurchaseDate(e.target.value)} />
              </div>
            </div>

            {/* Extra Note */}
            <div className="space-y-1.5">
              <Label>Extra Note</Label>
              <Textarea
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder="Any additional notes..."
                maxLength={1000}
                className="min-h-[60px]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

