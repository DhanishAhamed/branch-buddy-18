import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { User, Phone, Plus } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, TouchSensor } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { StatusTransitionDialog } from '@/components/pipeline/StatusTransitionDialog';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  pipeline: string | null;
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

function DraggableCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: lead,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={`p-3 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-primary">{lead.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">{lead.name}</p>
          {lead.phone && (
            <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ stage, leads, onCardClick }: { stage: PipelineStage; leads: Lead[]; onCardClick: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.name });

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-full">
      <Card className={`flex-1 flex flex-col ${isOver ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-2 shrink-0">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className={`px-2 py-0.5 rounded ${stage.color}`}>{stage.label}</span>
            <Badge variant="secondary" className="ml-2">{leads.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent ref={setNodeRef} className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
          {leads.map(lead => (
            <DraggableCard key={lead.id} lead={lead} onClick={() => onCardClick(lead.id)} />
          ))}
          {leads.length === 0 && (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
              Drop here
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeTab, setActiveTab] = useState('ops');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [mobileActiveStage, setMobileActiveStage] = useState<string | null>(null);
  const { profile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean;
    leadId: string;
    leadName: string;
    fromStatus: string;
    toStatus: string;
  }>({ open: false, leadId: '', leadName: '', fromStatus: '', toStatus: '' });

  const [detailModal, setDetailModal] = useState<{ open: boolean; leadId: string | null }>({
    open: false,
    leadId: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  useEffect(() => {
    fetchStages();
    fetchProperties();
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
    if (data) {
      setStages(data);
      if (!mobileActiveStage && data.length > 0) {
        setMobileActiveStage(data[0].name);
      }
    }
  };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, name, phone, status, pipeline')
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
    assignedStaffId?: string;
  }) => {
    const { leadId, toStatus } = transitionDialog;

    const leadUpdate: any = { status: toStatus };
    if (data.siteVisitTime) {
      leadUpdate.site_visit_time = data.siteVisitTime.toISOString();
    }
    if (toStatus === 'site_visit_scheduled' && data.assignedStaffId) {
      leadUpdate.assigned_to = data.assignedStaffId;
    }

    await supabase
      .from('leads')
      .update(leadUpdate)
      .eq('id', leadId);

    if (data.callNotes) {
      await supabase.from('call_notes').insert([{
        lead_id: leadId,
        user_id: profile?.user_id,
        notes: data.callNotes,
        customer_response: data.customerResponse || null,
        followup_at: data.followupAt?.toISOString() || null,
      }]);
    }

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

    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, status: toStatus } : l
    ));

    setTransitionDialog({ open: false, leadId: '', leadName: '', fromStatus: '', toStatus: '' });
    toast({ title: 'Lead updated successfully' });
  };

  const getLeadsByStage = (stageName: string) => leads.filter(lead => lead.status === stageName);

  const currentStages = stages.filter(s => s.pipeline === activeTab);
  const canAccess = profile?.pipeline_access === 'both' || profile?.pipeline_access === activeTab;

  return (
    <div className="p-3 md:p-4 lg:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground">{leads.length} leads</p>
        </div>
        {!isMobile && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 mb-3 md:mb-4 shrink-0">
          <TabsTrigger value="ops" disabled={profile?.pipeline_access === 'sales'}>Operational</TabsTrigger>
          <TabsTrigger value="sales" disabled={profile?.pipeline_access === 'ops'}>Sales</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 overflow-hidden">
          {canAccess ? (
            isMobile ? (
              /* Mobile: single column with tab pills */
              <div className="flex flex-col h-full">
                {/* Stage pills - horizontally scrollable */}
                <div className="flex gap-2 overflow-x-auto pb-3 scroll-x-hidden shrink-0">
                  {currentStages.map(stage => {
                    const count = getLeadsByStage(stage.name).length;
                    const isActive = mobileActiveStage === stage.name;
                    return (
                      <button
                        key={stage.name}
                        onClick={() => setMobileActiveStage(stage.name)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                          isActive 
                            ? 'bg-[#1a4731] text-white' 
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {stage.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-white/20' : 'bg-border'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active stage cards */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {mobileActiveStage && getLeadsByStage(mobileActiveStage).map(lead => (
                    <DraggableCard 
                      key={lead.id} 
                      lead={lead} 
                      onClick={() => setDetailModal({ open: true, leadId: lead.id })} 
                    />
                  ))}
                  {mobileActiveStage && getLeadsByStage(mobileActiveStage).length === 0 && (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
                      No leads in this stage
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Desktop/Tablet: kanban board with horizontal scroll */
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex gap-4 h-full overflow-x-auto pb-4 scroll-touch">
                  {currentStages.map(stage => (
                    <DroppableColumn 
                      key={`${stage.pipeline}-${stage.name}`} 
                      stage={stage} 
                      leads={getLeadsByStage(stage.name)} 
                      onCardClick={(id) => setDetailModal({ open: true, leadId: id })}
                    />
                  ))}
                </div>
              </DndContext>
            )
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">You don't have access to this pipeline.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Mobile FAB */}
      {isMobile && (
        <button
          className="fab-button"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

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
        onLeadUpdated={fetchLeads}
      />

      <AddLeadDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
