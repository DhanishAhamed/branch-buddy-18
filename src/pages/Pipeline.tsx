import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Search, Plus, Phone, Mail, Calendar, ArrowRight, MoreVertical, ChevronDown } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, TouchSensor } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { StatusTransitionDialog } from '@/components/pipeline/StatusTransitionDialog';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  pipeline: string | null;
  source: string | null;
  created_at: string;
  site_visit_time: string | null;
  budget_max: number | null;
  assigned_to: string | null;
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

const STAGE_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  site_visit_scheduled: '#40916c',
  negotiating: '#f97316',
  closed_won: '#1a4731',
  closed_lost: '#dc2626',
  not_interested: '#94a3b8',
  need_followup: '#f59e0b',
};

const STAGE_SUBLABELS: Record<string, string> = {
  new: 'Just came in',
  contacted: 'In conversation',
  qualified: 'Serious buyers',
  site_visit_scheduled: 'Scheduled visits',
  negotiating: 'Discussing price',
  closed_won: 'Deals closed',
  closed_lost: 'Not converted',
  not_interested: 'Dropped off',
  need_followup: 'Needs attention',
};

const STAGE_TINTS: Record<string, string> = {
  new: '#dbeafe',
  contacted: '#fef3c7',
  qualified: '#ede9fe',
  site_visit_scheduled: '#d8f3dc',
  negotiating: '#ffedd5',
  closed_won: '#d8f3dc',
  closed_lost: '#fee2e2',
  not_interested: '#f1f5f9',
  need_followup: '#fef3c7',
};

function StyledDraggableCard({
  lead,
  onClick,
  stages,
  onMoveNext,
}: {
  lead: Lead;
  onClick: () => void;
  stages: PipelineStage[];
  onMoveNext: (leadId: string, nextStatus: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: lead,
  });
  const [hovered, setHovered] = useState(false);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : 'auto' as const,
        opacity: isDragging ? 0.8 : 1,
      }
    : undefined;

  const stageColor = STAGE_COLORS[lead.status] || '#94a3b8';
  const initials = lead.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const currentIndex = stages.findIndex((s) => s.name === lead.status);
  const nextStage = currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative bg-white rounded-xl border border-[#e2e8ed] cursor-grab active:cursor-grabbing transition-all duration-200 pipeline-card-animate ${
        isDragging ? 'shadow-lg' : hovered ? 'shadow-md -translate-y-0.5' : ''
      }`}
      role="button"
      tabIndex={0}
    >
      {/* Left edge stripe */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
        style={{ background: stageColor }}
      />

      <div className="p-3.5 pl-4">
        {/* Top row */}
        <div className="flex items-start gap-2.5 mb-2">
          <div
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-white shrink-0"
            style={{
              background: `linear-gradient(135deg, ${stageColor}, ${stageColor}cc)`,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-foreground truncate">{lead.name}</p>
            <p className="text-[10.5px] text-[#94a3b8] truncate">
              {lead.source || 'Direct'} · {format(new Date(lead.created_at), 'MMM d')}
            </p>
          </div>
          <button
            className="shrink-0 p-1 rounded-md hover:bg-[#f1f4f6] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <MoreVertical className="h-3.5 w-3.5 text-[#94a3b8]" />
          </button>
        </div>

        {/* Info rows */}
        <div className="space-y-1 mb-2">
          {lead.phone && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-[#94a3b8]">
              <Phone className="h-3 w-3" />
              <span>{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-[#94a3b8]">
              <Mail className="h-3 w-3" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.status === 'site_visit_scheduled' && lead.site_visit_time && (
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: '#40916c' }}>
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(lead.site_visit_time), 'MMM d, h:mm a')}</span>
            </div>
          )}
          {lead.status === 'negotiating' && lead.budget_max && (
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: '#f97316' }}>
              <span>₹{(lead.budget_max / 100000).toFixed(0)}L</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#f1f4f6]">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: STAGE_TINTS[lead.status] || '#f1f4f6', color: stageColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageColor }} />
            {STAGE_SUBLABELS[lead.status] || lead.status}
          </span>

          {hovered && nextStage && (
            <button
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors"
              style={{ background: '#f0faf4', color: '#40916c' }}
              onClick={(e) => {
                e.stopPropagation();
                onMoveNext(lead.id, nextStage.name);
              }}
            >
              Move <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StyledDroppableColumn({
  stage,
  leads,
  allStages,
  onCardClick,
  onMoveNext,
  animDelay,
}: {
  stage: PipelineStage;
  leads: Lead[];
  allStages: PipelineStage[];
  onCardClick: (id: string) => void;
  onMoveNext: (leadId: string, nextStatus: string) => void;
  animDelay: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.name });
  const stageColor = STAGE_COLORS[stage.name] || '#94a3b8';
  const isWon = stage.name === 'closed_won';
  const isLost = stage.name === 'closed_lost';

  return (
    <div
      className="w-[272px] flex-shrink-0 flex flex-col pipeline-col-animate"
      style={{ animationDelay: `${animDelay}s` }}
    >
      {/* Column header */}
      <div
        className="bg-white rounded-t-xl px-3 py-2.5 flex items-center justify-between"
        style={{ borderBottom: `3px solid ${stageColor}` }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: stageColor }} />
          <span className="text-[13px] font-bold text-foreground">{stage.label}</span>
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              background: STAGE_TINTS[stage.name] || '#f1f4f6',
              color: stageColor,
            }}
          >
            {leads.length}
          </span>
        </div>
        <button className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#f1f4f6] transition-colors">
          <Plus className="h-3.5 w-3.5 text-[#94a3b8]" />
        </button>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-b-xl p-2.5 space-y-2 min-h-[200px] transition-colors ${
          isOver ? 'border-2 border-dashed' : 'border border-[#e2e8ed] border-t-0'
        }`}
        style={{
          background: isOver
            ? '#f0faf4'
            : isWon
            ? '#f0faf4'
            : isLost
            ? '#fef2f2'
            : '#f8fafb',
          borderColor: isOver ? '#40916c' : undefined,
        }}
      >
        {leads.map((lead) => (
          <StyledDraggableCard
            key={lead.id}
            lead={lead}
            onClick={() => onCardClick(lead.id)}
            stages={allStages}
            onMoveNext={onMoveNext}
          />
        ))}
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-24 text-[#94a3b8] text-[11px] border-2 border-dashed border-[#e2e8ed] rounded-lg">
            Drop here or +
          </div>
        )}
      </div>
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
  const [searchQuery, setSearchQuery] = useState('');
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
    if (activeWorkspace?.id) {
      fetchLeads();
      fetchProperties();
    }
  }, [profile, activeWorkspace?.id]);

  const fetchStages = async () => {
    const { data } = await supabase.from('pipeline_stages').select('*').order('position');
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
      .select('id, name, phone, email, status, pipeline, source, created_at, site_visit_time, budget_max, assigned_to')
      .order('created_at', { ascending: false });
    if (data) setLeads(data);
  };

  const fetchProperties = async () => {
    const { data } = await supabase.from('properties').select('id, title, address').eq('status', 'available');
    if (data) setProperties(data);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newStatus = String(over.id);
    const leadId = String(active.id);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const fromStatus = lead.status;
    const allStageNames = stages.map((s) => s.name);
    if (!allStageNames.includes(newStatus)) return;

    handleStatusChange(leadId, lead.name, fromStatus, newStatus);
  };

  const handleStatusChange = async (leadId: string, leadName: string, fromStatus: string, toStatus: string) => {
    const needsDialog = ['contacted', 'qualified', 'site_visit_scheduled', 'need_followup'].includes(toStatus);

    if (needsDialog) {
      setTransitionDialog({ open: true, leadId, leadName, fromStatus, toStatus });
    } else {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: toStatus } : l)));
      await supabase.from('leads').update({ status: toStatus as any }).eq('id', leadId);
      toast({ title: 'Lead moved successfully' });
    }
  };

  const handleMoveNext = (leadId: string, nextStatus: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    handleStatusChange(leadId, lead.name, lead.status, nextStatus);
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
    if (data.siteVisitTime) leadUpdate.site_visit_time = data.siteVisitTime.toISOString();
    if (toStatus === 'site_visit_scheduled' && data.assignedStaffId) leadUpdate.assigned_to = data.assignedStaffId;

    await supabase.from('leads').update(leadUpdate).eq('id', leadId);

    if (data.callNotes) {
      await supabase.from('call_notes').insert([
        {
          lead_id: leadId,
          user_id: profile?.user_id,
          notes: data.callNotes,
          customer_response: data.customerResponse || null,
          followup_at: data.followupAt?.toISOString() || null,
        },
      ]);
    }

    if (data.propertyId) {
      const { data: existing } = await supabase
        .from('lead_properties')
        .select('id')
        .eq('lead_id', leadId)
        .eq('property_id', data.propertyId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('lead_properties').insert([{ lead_id: leadId, property_id: data.propertyId }]);
      }
    }

    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: toStatus } : l)));
    setTransitionDialog({ open: false, leadId: '', leadName: '', fromStatus: '', toStatus: '' });
    toast({ title: 'Lead updated successfully' });
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.email?.toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  const getLeadsByStage = (stageName: string) => filteredLeads.filter((lead) => lead.status === stageName);

  const currentStages = stages.filter((s) => s.pipeline === activeTab);
  const canAccess = profile?.pipeline_access === 'both' || profile?.pipeline_access === activeTab;

  // Summary counts across all stages
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    stages.forEach((s) => {
      counts[s.name] = leads.filter((l) => l.status === s.name).length;
    });
    return counts;
  }, [leads, stages]);

  const opsCount = stages.filter((s) => s.pipeline === 'ops').reduce((sum, s) => sum + (stageCounts[s.name] || 0), 0);
  const salesCount = stages.filter((s) => s.pipeline === 'sales').reduce((sum, s) => sum + (stageCounts[s.name] || 0), 0);

  return (
    <div className="p-5 md:px-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[24px] font-[800] text-foreground">Pipeline</h1>
          <p className="text-[12px] text-[#94a3b8]">Track every lead from first contact to closed deal</p>
        </div>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] border border-[#e2e8ed] bg-white text-[13px] font-bold text-foreground hover:bg-[#f8fafb] transition-colors"
              >
                <Search className="h-3.5 w-3.5 text-[#94a3b8]" />
                Filters
              </button>
              <button
                onClick={() => setIsAddDialogOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: '#1a4731' }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Lead
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="hidden lg:flex rounded-[14px] border border-[#e2e8ed] bg-white mb-4 overflow-hidden">
        {stages.map((stage, i) => {
          const color = STAGE_COLORS[stage.name] || '#94a3b8';
          const count = stageCounts[stage.name] || 0;
          return (
            <div
              key={stage.name}
              className="flex-1 px-3 py-3 text-center group hover:bg-[#f8fafb] transition-colors relative"
              style={{ borderRight: i < stages.length - 1 ? '1px solid #f1f4f6' : undefined }}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[10px] uppercase text-[#94a3b8] font-semibold tracking-wide">
                  {stage.label}
                </span>
              </div>
              <p className="text-[22px] font-[800] text-foreground">{count}</p>
              <p className="text-[11px] text-[#94a3b8]">{STAGE_SUBLABELS[stage.name] || ''}</p>
              <div
                className="absolute bottom-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: color }}
              />
            </div>
          );
        })}
      </div>

      {/* Search & Count */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="relative flex-1 max-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94a3b8]" />
          <Input
            placeholder="Search by name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-[12px] rounded-[10px] border-[#e2e8ed]"
          />
        </div>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: '#d8f3dc', color: '#1a4731' }}
        >
          {filteredLeads.length} leads
        </span>
      </div>

      {/* Group Tabs */}
      <div className="flex gap-2 mb-3 shrink-0">
        <button
          onClick={() => setActiveTab('ops')}
          disabled={profile?.pipeline_access === 'sales'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-colors disabled:opacity-50"
          style={{
            background: activeTab === 'ops' ? '#1a4731' : '#fff',
            color: activeTab === 'ops' ? '#fff' : '#94a3b8',
            border: activeTab === 'ops' ? 'none' : '1px solid #e2e8ed',
          }}
        >
          Operational Stages
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{
              background: activeTab === 'ops' ? 'rgba(255,255,255,0.2)' : '#f1f4f6',
            }}
          >
            {opsCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          disabled={profile?.pipeline_access === 'ops'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-colors disabled:opacity-50"
          style={{
            background: activeTab === 'sales' ? '#1a4731' : '#fff',
            color: activeTab === 'sales' ? '#fff' : '#94a3b8',
            border: activeTab === 'sales' ? 'none' : '1px solid #e2e8ed',
          }}
        >
          Sales Stages
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{
              background: activeTab === 'sales' ? 'rgba(255,255,255,0.2)' : '#f1f4f6',
            }}
          >
            {salesCount}
          </span>
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden min-h-0">
        {canAccess ? (
          isMobile ? (
            <div className="flex flex-col h-full">
              {/* Mobile stage pills */}
              <div className="flex gap-2 overflow-x-auto pb-3 scroll-x-hidden shrink-0">
                {currentStages.map((stage) => {
                  const count = getLeadsByStage(stage.name).length;
                  const isActive = mobileActiveStage === stage.name;
                  const color = STAGE_COLORS[stage.name] || '#94a3b8';
                  return (
                    <button
                      key={stage.name}
                      onClick={() => setMobileActiveStage(stage.name)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                      style={{
                        background: isActive ? '#1a4731' : '#fff',
                        color: isActive ? '#fff' : '#94a3b8',
                        border: isActive ? 'none' : '1px solid #e2e8ed',
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: isActive ? '#fff' : color }} />
                      {stage.label}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: isActive ? 'rgba(255,255,255,0.2)' : '#f1f4f6' }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile cards */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {mobileActiveStage &&
                  getLeadsByStage(mobileActiveStage).map((lead) => (
                    <StyledDraggableCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setDetailModal({ open: true, leadId: lead.id })}
                      stages={stages}
                      onMoveNext={handleMoveNext}
                    />
                  ))}
                {mobileActiveStage && getLeadsByStage(mobileActiveStage).length === 0 && (
                  <div className="flex items-center justify-center h-32 text-[#94a3b8] text-sm border-2 border-dashed border-[#e2e8ed] rounded-xl">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="flex gap-3 h-full overflow-x-auto pb-4 scroll-touch">
                {currentStages.map((stage, i) => (
                  <StyledDroppableColumn
                    key={`${stage.pipeline}-${stage.name}`}
                    stage={stage}
                    leads={getLeadsByStage(stage.name)}
                    allStages={stages}
                    onCardClick={(id) => setDetailModal({ open: true, leadId: id })}
                    onMoveNext={handleMoveNext}
                    animDelay={i * 0.05}
                  />
                ))}
              </div>
            </DndContext>
          )
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-[#94a3b8]">You don't have access to this pipeline.</p>
          </div>
        )}

        {/* No search results */}
        {searchQuery && filteredLeads.length === 0 && (
          <div className="text-center py-8 text-[#94a3b8] text-[13px]">No leads match your search</div>
        )}
      </div>

      {/* Mobile FAB */}
      {isMobile && (
        <button className="fab-button" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-6 w-6" />
        </button>
      )}

      <StatusTransitionDialog
        open={transitionDialog.open}
        onOpenChange={(open) => setTransitionDialog((prev) => ({ ...prev, open }))}
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

      <AddLeadDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onSuccess={fetchLeads} />
    </div>
  );
}
