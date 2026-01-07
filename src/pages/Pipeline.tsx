import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Phone } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  pipeline: string | null;
}

const allStages = ['new', 'contacted', 'qualified', 'site_visit_scheduled', 'negotiating', 'closed_won', 'closed_lost'];
const opsStages = ['new', 'contacted', 'qualified', 'site_visit_scheduled'];
const salesStages = ['site_visit_scheduled', 'negotiating', 'closed_won', 'closed_lost'];

const stageLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  site_visit_scheduled: 'Site Visit',
  negotiating: 'Negotiating',
  closed_won: 'Won',
  closed_lost: 'Lost',
};

const stageColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600',
  contacted: 'bg-yellow-500/10 text-yellow-600',
  qualified: 'bg-purple-500/10 text-purple-600',
  site_visit_scheduled: 'bg-primary/10 text-primary',
  negotiating: 'bg-orange-500/10 text-orange-600',
  closed_won: 'bg-green-500/10 text-green-600',
  closed_lost: 'bg-destructive/10 text-destructive',
};

function DraggableCard({ lead }: { lead: Lead }) {
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
      className={`p-3 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-primary">{lead.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">{lead.name}</p>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="text-xs text-primary flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" />
              {lead.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ stage, leads }: { stage: string; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-full">
      <Card className={`flex-1 flex flex-col ${isOver ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-2 shrink-0">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className={`px-2 py-0.5 rounded ${stageColors[stage]}`}>{stageLabels[stage]}</span>
            <Badge variant="secondary" className="ml-2">{leads.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent ref={setNodeRef} className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
          {leads.map(lead => (
            <DraggableCard key={lead.id} lead={lead} />
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
  const [activeTab, setActiveTab] = useState('ops');
  const { profile } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (profile?.branch_id) {
      fetchLeads();
    }
  }, [profile]);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, name, phone, status, pipeline')
      .order('created_at', { ascending: false });
    if (data) setLeads(data);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newStatus = String(over.id);
    const leadId = String(active.id);
    if (!allStages.includes(newStatus)) return;

    // Optimistic update
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, status: newStatus } : lead
    ));

    await supabase
      .from('leads')
      .update({ status: newStatus as any })
      .eq('id', leadId);
  };

  const getLeadsByStage = (stage: string) => leads.filter(lead => lead.status === stage);

  const stages = activeTab === 'ops' ? opsStages : salesStages;
  const canAccess = profile?.pipeline_access === 'both' || profile?.pipeline_access === activeTab;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 mb-4 shrink-0">
          <TabsTrigger value="ops" disabled={profile?.pipeline_access === 'sales'}>Operational</TabsTrigger>
          <TabsTrigger value="sales" disabled={profile?.pipeline_access === 'ops'}>Sales</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 overflow-hidden">
          {canAccess ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="flex gap-4 h-full overflow-x-auto pb-4">
                {stages.map(stage => (
                  <DroppableColumn key={stage} stage={stage} leads={getLeadsByStage(stage)} />
                ))}
              </div>
            </DndContext>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">You don't have access to this pipeline.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
