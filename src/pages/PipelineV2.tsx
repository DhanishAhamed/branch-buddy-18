import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/kibo-ui/kanban';
import { StatusTransitionDialog } from '@/components/pipeline/StatusTransitionDialog';
import { LeadDetailModal } from '@/components/pipeline/LeadDetailModal';
import { PipelineFilters } from '@/components/pipeline/PipelineFilters';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Phone, Mail } from 'lucide-react';
import { DragEndEvent } from '@dnd-kit/core';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  pipeline: string | null;
  created_at: string;
  assigned_to: string | null;
  source: string | null;
}

interface Property {
  id: string;
  title: string;
  address: string | null;
}

interface PipelineStage {
  id: string;
  name: string;
  label: string;
  pipeline: string;
  color: string;
  position: number;
}

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  label: string;
  stageName: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export default function PipelineV2() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState('ops');
  const { profile, isAdmin } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  // Filter state
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });

  // Transition dialog state
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean;
    leadId: string;
    leadName: string;
    fromStatus: string;
    toStatus: string;
  }>({ open: false, leadId: '', leadName: '', fromStatus: '', toStatus: '' });

  // Lead detail modal state
  const [detailModal, setDetailModal] = useState<{ open: boolean; leadId: string | null }>({
    open: false,
    leadId: null,
  });

  useEffect(() => {
    fetchStages();
    fetchProperties();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (profile?.branch_id) {
      fetchLeads();
      fetchProperties();
    }
  }, [profile, activeWorkspace?.id]);

  const fetchStages = async () => {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('position');
    if (data) setStages(data);
  };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, name, phone, email, status, pipeline, created_at, assigned_to, source')
      .order('created_at', { ascending: false });
    if (data) setLeads(data);
  };

  const fetchProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('id, title, address')
      .eq('status', 'available');
    if (data) setProperties(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name');
    if (data) setUsers(data);
  };

  // Get unique sources from leads
  const sources = useMemo(() => {
    const sourceSet = new Set(leads.map((l) => l.source).filter(Boolean) as string[]);
    return Array.from(sourceSet);
  }, [leads]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Source filter
      if (selectedSource && lead.source !== selectedSource) return false;

      // User filter
      if (selectedUser === 'unassigned' && lead.assigned_to !== null) return false;
      if (selectedUser && selectedUser !== 'unassigned' && lead.assigned_to !== selectedUser) return false;

      // Date range filter
      const leadDate = new Date(lead.created_at);
      if (dateRange.from && leadDate < dateRange.from) return false;
      if (dateRange.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        if (leadDate > endOfDay) return false;
      }

      return true;
    });
  }, [leads, selectedSource, selectedUser, dateRange]);

  const clearFilters = () => {
    setSelectedSource(null);
    setSelectedUser(null);
    setDateRange({ from: null, to: null });
  };

  // Convert stages to Kanban columns
  const currentStages = stages.filter(s => s.pipeline === activeTab);
  
  const kanbanColumns: KanbanColumn[] = useMemo(() => 
    currentStages.map(stage => ({
      id: stage.name,
      name: stage.name,
      color: stage.color,
      label: stage.label,
      stageName: stage.name,
    })),
    [currentStages]
  );

  const getLeadsByColumn = (columnId: string) => 
    filteredLeads.filter(lead => lead.status === columnId && (lead.pipeline === activeTab || lead.pipeline === null));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newStatus = String(over.id);
    const leadId = String(active.id);
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const fromStatus = lead.status;
    const allStageNames = stages.map(s => s.name);
    if (!allStageNames.includes(newStatus)) return;

    // Check if we need a transition dialog
    const needsDialog = ['contacted', 'qualified', 'site_visit_scheduled', 'need_followup'].includes(newStatus);

    if (needsDialog) {
      setTransitionDialog({
        open: true,
        leadId,
        leadName: lead.name,
        fromStatus,
        toStatus: newStatus,
      });
    } else {
      // Direct update without dialog
      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, status: newStatus } : l
      ));

      await supabase
        .from('leads')
        .update({ status: newStatus as any })
        .eq('id', leadId);
    }
  };

  const handleTransitionConfirm = async (data: {
    callNotes: string;
    customerResponse?: string;
    followupAt?: Date;
    propertyId?: string;
    siteVisitTime?: Date;
  }) => {
    const { leadId, toStatus } = transitionDialog;

    // Update lead status
    const leadUpdate: any = { status: toStatus };
    if (data.siteVisitTime) {
      leadUpdate.site_visit_time = data.siteVisitTime.toISOString();
    }

    await supabase
      .from('leads')
      .update(leadUpdate)
      .eq('id', leadId);

    // Add call note
    if (data.callNotes) {
      await supabase.from('call_notes').insert([{
        lead_id: leadId,
        user_id: profile?.user_id,
        notes: data.callNotes,
        customer_response: data.customerResponse || null,
        followup_at: data.followupAt?.toISOString() || null,
      }]);
    }

    // Link property if selected
    if (data.propertyId) {
      const { data: existing } = await supabase
        .from('lead_properties')
        .select('id')
        .eq('lead_id', leadId)
        .eq('property_id', data.propertyId)
        .maybeSingle();
      
      if (!existing) {
        await supabase.from('lead_properties').insert([{
          lead_id: leadId,
          property_id: data.propertyId,
        }]);
      }
    }

    // Update local state
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, status: toStatus } : l
    ));

    setTransitionDialog({ open: false, leadId: '', leadName: '', fromStatus: '', toStatus: '' });
    toast({ title: 'Lead updated successfully' });
  };

  const canAccess = profile?.pipeline_access === 'both' || profile?.pipeline_access === activeTab;

  // Drag overlay content renderer
  const renderDragOverlay = (lead: Lead) => (
    <div className="p-3 bg-card rounded-lg border border-primary/50 shadow-xl min-w-[260px]">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {lead.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {lead.name}
              </p>
            </div>
          </div>
        </div>

        {(lead.phone || lead.email) && (
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {lead.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                <span className="truncate">{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{dateFormatter.format(new Date(lead.created_at))}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <div className="flex items-center gap-2">
          <PipelineFilters
            sources={sources}
            users={users}
            selectedSource={selectedSource}
            selectedUser={selectedUser}
            dateRange={dateRange}
            onSourceChange={setSelectedSource}
            onUserChange={setSelectedUser}
            onDateRangeChange={setDateRange}
            onClearFilters={clearFilters}
          />
          <Badge variant="outline" className="text-xs">
            {filteredLeads.filter(l => l.pipeline === activeTab || l.pipeline === null).length} leads
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 mb-4 shrink-0">
          <TabsTrigger value="ops" disabled={profile?.pipeline_access === 'sales'}>Operational</TabsTrigger>
          <TabsTrigger value="sales" disabled={profile?.pipeline_access === 'ops'}>Sales</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 overflow-hidden">
          {canAccess ? (
            <KanbanProvider
              columns={kanbanColumns}
              items={filteredLeads}
              setItems={setLeads}
              onDragEnd={handleDragEnd}
              dragOverlayContent={renderDragOverlay}
            >
              {(column) => (
                <KanbanBoard key={column.id} id={column.id}>
                  <KanbanHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getColorFromClass(column.color) }}
                        />
                        <span className="font-medium text-sm text-foreground">{column.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getLeadsByColumn(column.id).length}
                      </Badge>
                    </div>
                  </KanbanHeader>
                  <KanbanCards items={getLeadsByColumn(column.id)}>
                    {(lead: Lead) => (
                      <KanbanCard
                        id={lead.id}
                        name={lead.name}
                        onClick={() => setDetailModal({ open: true, leadId: lead.id })}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                  {lead.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">
                                  {lead.name}
                                </p>
                              </div>
                            </div>
                          </div>

                          {(lead.phone || lead.email) && (
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              {lead.phone && (isAdmin || profile?.can_view_owners) && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3 w-3" />
                                  <span className="truncate">{lead.phone}</span>
                                </div>
                              )}
                              {lead.email && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{dateFormatter.format(new Date(lead.created_at))}</span>
                          </div>
                        </div>
                      </KanbanCard>
                    )}
                  </KanbanCards>
                </KanbanBoard>
              )}
            </KanbanProvider>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">You don't have access to this pipeline.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <StatusTransitionDialog
        open={transitionDialog.open}
        onOpenChange={(open) => setTransitionDialog(prev => ({ ...prev, open }))}
        fromStatus={transitionDialog.fromStatus}
        toStatus={transitionDialog.toStatus}
        leadName={transitionDialog.leadName}
        properties={properties}
        onConfirm={handleTransitionConfirm}
      />

      <LeadDetailModal
        open={detailModal.open}
        onOpenChange={(open) => setDetailModal({ open, leadId: open ? detailModal.leadId : null })}
        leadId={detailModal.leadId}
      />
    </div>
  );
}

// Helper function to extract color from Tailwind class
function getColorFromClass(colorClass: string): string {
  const colorMap: Record<string, string> = {
    'bg-blue-500/10': '#3B82F6',
    'bg-yellow-500/10': '#F59E0B',
    'bg-green-500/10': '#10B981',
    'bg-purple-500/10': '#8B5CF6',
    'bg-red-500/10': '#EF4444',
    'bg-orange-500/10': '#F97316',
    'bg-pink-500/10': '#EC4899',
    'bg-primary/10': 'hsl(var(--primary))',
  };
  
  for (const [key, value] of Object.entries(colorMap)) {
    if (colorClass.includes(key.replace('bg-', '').replace('/10', ''))) {
      return value;
    }
  }
  
  return 'hsl(var(--primary))';
}
