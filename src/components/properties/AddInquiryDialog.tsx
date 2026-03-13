import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Loader2, User, Phone } from 'lucide-react';

interface Lead {
    id: string;
    name: string;
    phone: string | null;
    workspace_id: string | null;
}

interface Property {
    id: string;
    title: string;
    workspace_id: string | null;
}

interface AddInquiryDialogProps {
    property: Property;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddInquiryDialog({ property, open, onOpenChange }: AddInquiryDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Lead[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    // Reset state when opened
    useEffect(() => {
        if (open) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedLead(null);
            setNotes('');
        }
    }, [open]);

    // Debounced search
    useEffect(() => {
        const searchLeads = async () => {
            if (!searchQuery.trim() || searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .select('id, name, phone, workspace_id')
                    .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
                    .limit(10);

                if (error) throw error;
                setSearchResults(data || []);
            } catch (err: any) {
                console.error('Lead search error:', err);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(searchLeads, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSubmit = async () => {
        if (!selectedLead || !user) return;

        setIsSubmitting(true);
        try {
            // 1. Check if the property is already linked
            const { data: existingLink } = await supabase
                .from('lead_properties')
                .select('id')
                .eq('lead_id', selectedLead.id)
                .eq('property_id', property.id)
                .maybeSingle();

            if (!existingLink) {
                // Build insert object safely according to schema types
                const linkInsert: any = {
                    lead_id: selectedLead.id,
                    property_id: property.id,
                };
                // Add workspace_id if your schema expects it on lead_properties
                if (selectedLead.workspace_id) linkInsert.workspace_id = selectedLead.workspace_id;

                const { error: linkError } = await supabase
                    .from('lead_properties')
                    .insert(linkInsert);

                if (linkError) throw linkError;
            }

            // 2. Add the note referencing the property
            if (notes.trim()) {
                const { error: noteError } = await supabase
                    .from('call_notes')
                    .insert({
                        lead_id: selectedLead.id,
                        user_id: user.id,
                        notes: `[Inquiry: ${property.title}] ${notes.trim()}`,
                        workspace_id: selectedLead.workspace_id,
                    });

                if (noteError) throw noteError;
            }

            toast({
                title: 'Inquiry Added',
                description: `Successfully linked ${property.title} to ${selectedLead.name}`,
            });
            onOpenChange(false);
        } catch (err: any) {
            console.error('Add inquiry error:', err);
            toast({
                title: 'Error',
                description: err.message || 'Failed to add inquiry.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Inquiry to Customer</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    {!selectedLead ? (
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-foreground">
                                Search Customer
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    autoFocus
                                    placeholder="Search by name or phone..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                            </div>

                            {/* Search Results */}
                            {searchQuery.length >= 2 && (
                                <div className="border rounded-md max-h-48 overflow-y-auto mt-2">
                                    {searchResults.length === 0 && !isSearching ? (
                                        <div className="p-3 text-sm text-center text-muted-foreground">
                                            No customers found. Create them in Leads first.
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {searchResults.map((lead) => (
                                                <button
                                                    key={lead.id}
                                                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center justify-between"
                                                    onClick={() => setSelectedLead(lead)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium">{lead.name}</span>
                                                    </div>
                                                    {lead.phone && (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Phone className="h-3 w-3" />
                                                            {lead.phone}
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            {/* Selected Lead Card */}
                            <div className="p-3 bg-muted/50 border rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Adding to: {selectedLead.name}</p>
                                    <p className="text-xs text-muted-foreground">{selectedLead.phone || 'No phone'}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedLead(null)}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Change
                                </Button>
                            </div>

                            {/* Property Preview */}
                            <div className="p-3 border rounded-lg bg-card">
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Property</p>
                                <p className="text-sm font-medium leading-tight">{property.title}</p>
                            </div>

                            {/* Notes Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Notes (Optional)
                                </label>
                                <Textarea
                                    placeholder="Customer budget, specific requests, timeline..."
                                    className="min-h-[100px]"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="bg-[#1a4731]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        'Save Inquiry'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
