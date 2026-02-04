import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLeadTemperature } from '@/hooks/use-lead-temperature';
import { LeadTemperatureBadge } from '@/components/pipeline/LeadTemperatureBadge';
import { useToast } from '@/hooks/use-toast';
import {
  User, Phone, Mail, Calendar, Building2,
  MessageSquare, Clock, MapPin, Eye, EyeOff,
  Copy, PhoneCall, Plus, Send, History, FileText,
  Home, CheckCircle2, Circle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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
}

interface CallNote {
  id: string;
  notes: string;
  customer_response: string | null;
  followup_at: string | null;
  created_at: string;
  user_id: string;
}

interface InterestedProperty {
  id: string;
  created_at: string;
  property: {
    id: string;
    title: string;
    address: string | null;
    price: number | null;
  };
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
}

interface HistoryEvent {
  id: string;
  type: 'created' | 'note' | 'property_added' | 'status_change';
  date: string;
  description: string;
  details?: string;
  user?: string;
}

interface LeadDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  onLeadUpdated?: () => void;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'New' },
  contacted: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', label: 'Contacted' },
  qualified: { bg: 'bg-purple-500/10', text: 'text-purple-600', label: 'Qualified' },
  site_visit_scheduled: { bg: 'bg-primary/10', text: 'text-primary', label: 'Site Visit Scheduled' },
  negotiating: { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Negotiating' },
  closed_won: { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Won 🎉' },
  closed_lost: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Lost' },
  not_interested: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Not Interested' },
  need_followup: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Need Follow-up' },
};

const pipelineStages = [
  { name: 'new', label: 'New' },
  { name: 'contacted', label: 'Contacted' },
  { name: 'qualified', label: 'Qualified' },
  { name: 'site_visit_scheduled', label: 'Site Visit' },
  { name: 'negotiating', label: 'Negotiating' },
  { name: 'closed_won', label: 'Won' },
];

export function LeadDetailModal({ open, onOpenChange, leadId, onLeadUpdated }: LeadDetailModalProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [callNotes, setCallNotes] = useState<CallNote[]>([]);
  const [interestedProperties, setInterestedProperties] = useState<InterestedProperty[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showPhone, setShowPhone] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const { profile, isAdmin } = useAuth();
  const { getLeadTemperature, showTemperatureIndicator } = useLeadTemperature();
  const { toast } = useToast();

  const canViewPhone = isAdmin || profile?.can_view_owners;

  useEffect(() => {
    if (open && leadId) {
      fetchLeadDetails();
      setActiveTab('details');
      setNewNote('');
    }
  }, [open, leadId]);

  const fetchLeadDetails = async () => {
    if (!leadId) return;

    const [leadRes, notesRes, propsRes, profilesRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).single(),
      supabase.from('call_notes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('lead_properties').select(`
        id,
        created_at,
        property:properties (
          id,
          title,
          address,
          price
        )
      `).eq('lead_id', leadId),
      supabase.from('profiles').select('id, user_id, full_name'),
    ]);

    if (leadRes.data) setLead(leadRes.data as Lead);
    if (notesRes.data) setCallNotes(notesRes.data);
    if (propsRes.data) setInterestedProperties(propsRes.data as any);
    if (profilesRes.data) setProfiles(profilesRes.data);
  };

  const getProfileName = (userId: string) => {
    return profiles.find(p => p.user_id === userId)?.full_name || 'Unknown';
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !leadId || !profile?.user_id) return;

    setIsAddingNote(true);
    try {
      const { error } = await supabase.from('call_notes').insert({
        lead_id: leadId,
        user_id: profile.user_id,
        notes: newNote.trim(),
      });

      if (error) throw error;

      toast({ title: 'Note added successfully' });
      setNewNote('');
      fetchLeadDetails();
      onLeadUpdated?.();
    } catch (error) {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    } finally {
      setIsAddingNote(false);
    }
  };

  // Build history timeline
  const buildHistory = (): HistoryEvent[] => {
    if (!lead) return [];

    const events: HistoryEvent[] = [];

    // Lead created
    events.push({
      id: 'created',
      type: 'created',
      date: lead.created_at,
      description: 'Lead was added to CRM',
      details: lead.source ? `Source: ${lead.source}` : undefined,
    });

    // Notes
    callNotes.forEach(note => {
      events.push({
        id: `note-${note.id}`,
        type: 'note',
        date: note.created_at,
        description: note.notes,
        details: note.customer_response ? `Customer: "${note.customer_response}"` : undefined,
        user: getProfileName(note.user_id),
      });
    });

    // Properties added
    interestedProperties.forEach(prop => {
      events.push({
        id: `prop-${prop.id}`,
        type: 'property_added',
        date: prop.created_at,
        description: `Interested in: ${prop.property.title}`,
        details: prop.property.address || undefined,
      });
    });

    // Sort by date descending
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getCurrentStageIndex = () => {
    if (!lead) return 0;
    const index = pipelineStages.findIndex(s => s.name === lead.status);
    return index >= 0 ? index : 0;
  };

  if (!lead) return null;

  const status = statusConfig[lead.status] || statusConfig.new;
  const history = buildHistory();
  const currentStageIndex = getCurrentStageIndex();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-start gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
            <FileText className="h-4 w-4" />
            Lead Details
          </div>
          
          {/* Lead Name and Badges */}
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-xl font-bold text-foreground">
              {lead.name}
            </SheetTitle>
            <div className="flex items-center gap-2 shrink-0">
              {showTemperatureIndicator && (
                <LeadTemperatureBadge
                  temperature={getLeadTemperature(lead.id, lead.created_at)}
                  size="default"
                  showLabel
                />
              )}
              <Badge className={`${status.bg} ${status.text} border-0`}>
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            {lead.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                {canViewPhone ? (
                  <>
                    <span>{showPhone ? lead.phone : maskPhone(lead.phone)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setShowPhone(!showPhone)}
                    >
                      {showPhone ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </>
                ) : (
                  <span>Hidden</span>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {lead.phone && canViewPhone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${lead.phone}`}>
                  <PhoneCall className="h-4 w-4 mr-1.5" />
                  Call
                </a>
              </Button>
            )}
            {lead.phone && canViewPhone && showPhone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(lead.phone!, 'Phone number')}
              >
                <Copy className="h-4 w-4 mr-1.5" />
                Copy Contact
              </Button>
            )}
          </div>

          {/* Created Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Added {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </span>
            {lead.assigned_to && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Assigned to: {getProfileName(lead.assigned_to)}
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 mx-6 mt-4" style={{ width: 'calc(100% - 48px)' }}>
            <TabsTrigger value="details" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
            <TabsTrigger value="properties" className="text-xs">Properties</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6">
            {/* Overview Tab */}
            <TabsContent value="details" className="mt-4 space-y-6">
              {/* Pipeline Progress */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Pipeline Progress
                  </h4>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      {pipelineStages.map((stage, index) => (
                        <div
                          key={stage.name}
                          className="flex flex-col items-center flex-1"
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                              index < currentStageIndex
                                ? 'bg-primary border-primary text-primary-foreground'
                                : index === currentStageIndex
                                ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20'
                                : 'bg-muted border-border text-muted-foreground'
                            }`}
                          >
                            {index < currentStageIndex ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Circle className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Progress line */}
                    <div className="absolute top-3 left-0 right-0 h-0.5 bg-border -z-10">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(currentStageIndex / (pipelineStages.length - 1)) * 100}%`,
                        }}
                      />
                    </div>
                    {/* Stage labels */}
                    <div className="flex items-center justify-between mt-1">
                      {pipelineStages.map((stage, index) => (
                        <span
                          key={stage.name}
                          className={`text-[10px] flex-1 text-center ${
                            index <= currentStageIndex
                              ? 'text-foreground font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {stage.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Overview */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Lead Overview
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {lead.email && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                        <p className="font-medium">{lead.email}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Source</p>
                      <p className="font-medium">{lead.source || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                      <Badge className={`${status.bg} ${status.text} border-0`}>
                        {status.label}
                      </Badge>
                    </div>
                    {lead.assigned_to && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Assigned To</p>
                        <p className="font-medium">{getProfileName(lead.assigned_to)}</p>
                      </div>
                    )}
                  </div>

                  {lead.site_visit_time && (
                    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg mt-3">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">
                        Site Visit: {format(new Date(lead.site_visit_time), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  )}

                  {lead.notes && (
                    <div className="p-3 bg-muted/50 rounded-lg mt-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                      <p className="text-sm">{lead.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-4 space-y-4">
              {/* Add Note Section */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Note
                  </h4>
                  <Textarea
                    placeholder="Write a note about this lead..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="mb-3 min-h-[80px]"
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isAddingNote}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    {isAddingNote ? 'Adding...' : 'Add Note'}
                  </Button>
                </CardContent>
              </Card>

              {/* Previous Notes */}
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Previous Notes ({callNotes.length})
                </h4>
                {callNotes.length > 0 ? (
                  <div className="space-y-3">
                    {callNotes.map((note) => (
                      <Card key={note.id} className="bg-muted/30">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {getProfileName(note.user_id)}
                            </span>
                            <span>{format(new Date(note.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                          </div>
                          {note.customer_response && (
                            <div className="p-2 bg-background rounded border-l-2 border-primary">
                              <p className="text-xs text-muted-foreground mb-1">Customer said:</p>
                              <p className="text-sm">{note.customer_response}</p>
                            </div>
                          )}
                          <p className="text-sm">{note.notes}</p>
                          {note.followup_at && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <Clock className="h-3 w-3" />
                              Follow-up: {format(new Date(note.followup_at), 'dd MMM yyyy')}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                      <p className="text-xs text-muted-foreground">Add a note to start tracking interactions</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties" className="mt-4 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Interested Properties ({interestedProperties.length})
              </h4>
              {interestedProperties.length > 0 ? (
                <div className="space-y-3">
                  {interestedProperties.map((ip) => (
                    <Card key={ip.id} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Home className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{ip.property.title}</p>
                              {ip.property.address && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {ip.property.address}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Added {formatDistanceToNow(new Date(ip.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          {ip.property.price && (
                            <Badge variant="outline" className="shrink-0">
                              {formatPrice(ip.property.price)}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No properties linked</p>
                    <p className="text-xs text-muted-foreground">Properties will appear here when added via Pipeline</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-4 pb-6">
              <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
                <History className="h-4 w-4" />
                Complete History
              </h4>
              
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
                
                <div className="space-y-4">
                  {history.map((event, index) => (
                    <div key={event.id} className="relative flex gap-4 pl-8">
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                        event.type === 'created'
                          ? 'bg-green-500/20 text-green-600'
                          : event.type === 'note'
                          ? 'bg-blue-500/20 text-blue-600'
                          : event.type === 'property_added'
                          ? 'bg-purple-500/20 text-purple-600'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {event.type === 'created' && <Plus className="h-3 w-3" />}
                        {event.type === 'note' && <MessageSquare className="h-3 w-3" />}
                        {event.type === 'property_added' && <Building2 className="h-3 w-3" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.date), 'dd MMM yyyy, hh:mm a')}
                          </span>
                          {event.user && (
                            <span className="text-xs text-muted-foreground">
                              by {event.user}
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{event.description}</p>
                        {event.details && (
                          <p className="text-xs text-muted-foreground mt-1">{event.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
