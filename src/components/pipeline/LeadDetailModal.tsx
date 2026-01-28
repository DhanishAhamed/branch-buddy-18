import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLeadTemperature } from '@/hooks/use-lead-temperature';
import { LeadTemperatureBadge } from './LeadTemperatureBadge';
import { 
  User, Phone, Mail, Calendar, Building2, 
  MessageSquare, Clock, MapPin, Eye, EyeOff 
} from 'lucide-react';
import { format } from 'date-fns';

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
  site_visit_time: string | null;
}

interface CallNote {
  id: string;
  notes: string;
  customer_response: string | null;
  followup_at: string | null;
  created_at: string;
}

interface InterestedProperty {
  id: string;
  property: {
    id: string;
    title: string;
    address: string | null;
    price: number | null;
  };
}

interface LeadDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
}

export function LeadDetailModal({ open, onOpenChange, leadId }: LeadDetailModalProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [callNotes, setCallNotes] = useState<CallNote[]>([]);
  const [interestedProperties, setInterestedProperties] = useState<InterestedProperty[]>([]);
  const [showPhone, setShowPhone] = useState(false);
  const { profile, isAdmin } = useAuth();
  const { getLeadTemperature, showTemperatureIndicator } = useLeadTemperature();

  const canViewPhone = isAdmin || profile?.can_view_owners;

  useEffect(() => {
    if (open && leadId) {
      fetchLeadDetails();
    }
  }, [open, leadId]);

  const fetchLeadDetails = async () => {
    if (!leadId) return;

    // Fetch lead
    const { data: leadData } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    
    if (leadData) setLead(leadData as Lead);

    // Fetch call notes
    const { data: notesData } = await supabase
      .from('call_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (notesData) setCallNotes(notesData);

    // Fetch interested properties
    const { data: propsData } = await supabase
      .from('lead_properties')
      .select(`
        id,
        property:properties (
          id,
          title,
          address,
          price
        )
      `)
      .eq('lead_id', leadId);
    
    if (propsData) setInterestedProperties(propsData as any);
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
    return `₹${price.toLocaleString()}`;
  };

  const maskPhone = (phone: string) => {
    if (phone.length <= 4) return '****';
    return phone.slice(0, 2) + '****' + phone.slice(-2);
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Lead Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-semibold">{lead.name}</h3>
                <div className="flex items-center gap-2">
                  {showTemperatureIndicator && (
                    <LeadTemperatureBadge 
                      temperature={getLeadTemperature(lead.id, lead.created_at)} 
                      size="default"
                      showLabel
                    />
                  )}
                  <Badge variant="secondary">{lead.status.replace(/_/g, ' ')}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {lead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {canViewPhone ? (
                      <div className="flex items-center gap-2">
                        <span>{showPhone ? lead.phone : maskPhone(lead.phone)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowPhone(!showPhone)}
                        >
                          {showPhone ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Hidden</span>
                    )}
                  </div>
                )}

                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.email}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Added {format(new Date(lead.created_at), 'dd MMM yyyy')}</span>
                </div>

                {lead.source && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Source: {lead.source}</span>
                  </div>
                )}
              </div>

              {lead.site_visit_time && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Site Visit: {format(new Date(lead.site_visit_time), 'dd MMM yyyy, hh:mm a')}
                  </span>
                </div>
              )}

              {lead.notes && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{lead.notes}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Interested Properties */}
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4" />
                Interested Properties ({interestedProperties.length})
              </h4>
              {interestedProperties.length > 0 ? (
                <div className="space-y-2">
                  {interestedProperties.map((ip) => (
                    <Card key={ip.id} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{ip.property.title}</p>
                            {ip.property.address && (
                              <p className="text-xs text-muted-foreground">{ip.property.address}</p>
                            )}
                          </div>
                          {ip.property.price && (
                            <Badge variant="outline">{formatPrice(ip.property.price)}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No properties linked yet</p>
              )}
            </div>

            <Separator />

            {/* Call Notes History */}
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4" />
                Call Notes History ({callNotes.length})
              </h4>
              {callNotes.length > 0 ? (
                <div className="space-y-3">
                  {callNotes.map((note) => (
                    <Card key={note.id} className="bg-muted/30">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{format(new Date(note.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                          {note.followup_at && (
                            <span className="flex items-center gap-1 text-primary">
                              <Clock className="h-3 w-3" />
                              Follow-up: {format(new Date(note.followup_at), 'dd MMM')}
                            </span>
                          )}
                        </div>
                        {note.customer_response && (
                          <div className="p-2 bg-background rounded border-l-2 border-primary">
                            <p className="text-xs text-muted-foreground mb-1">Customer said:</p>
                            <p className="text-sm">{note.customer_response}</p>
                          </div>
                        )}
                        <p className="text-sm">{note.notes}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No call notes yet</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
