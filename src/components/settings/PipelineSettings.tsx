import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Workflow, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PipelineStage {
  id: string;
  name: string;
  label: string;
  pipeline: string;
  color: string;
  position: number;
  is_system: boolean;
}

const colorOptions = [
  { value: 'bg-blue-500/10 text-blue-600', label: 'Blue' },
  { value: 'bg-green-500/10 text-green-600', label: 'Green' },
  { value: 'bg-yellow-500/10 text-yellow-600', label: 'Yellow' },
  { value: 'bg-orange-500/10 text-orange-600', label: 'Orange' },
  { value: 'bg-purple-500/10 text-purple-600', label: 'Purple' },
  { value: 'bg-pink-500/10 text-pink-600', label: 'Pink' },
  { value: 'bg-primary/10 text-primary', label: 'Primary' },
  { value: 'bg-destructive/10 text-destructive', label: 'Red' },
  { value: 'bg-muted text-muted-foreground', label: 'Gray' },
];

export function PipelineSettings() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [newStage, setNewStage] = useState({ name: '', label: '', pipeline: 'ops', color: colorOptions[0].value });
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('pipeline')
      .order('position');
    if (data) setStages(data);
  };

  const addStage = async () => {
    if (!newStage.name || !newStage.label) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    const maxPosition = stages
      .filter(s => s.pipeline === newStage.pipeline)
      .reduce((max, s) => Math.max(max, s.position), -1);

    await supabase.from('pipeline_stages').insert([{
      name: newStage.name.toLowerCase().replace(/\s+/g, '_'),
      label: newStage.label,
      pipeline: newStage.pipeline,
      color: newStage.color,
      position: maxPosition + 1,
      is_system: false,
    }]);

    toast({ title: 'Stage added' });
    setNewStage({ name: '', label: '', pipeline: 'ops', color: colorOptions[0].value });
    fetchStages();
  };

  const updateStage = async (id: string, updates: Partial<PipelineStage>) => {
    await supabase.from('pipeline_stages').update(updates).eq('id', id);
    toast({ title: 'Stage updated' });
    fetchStages();
  };

  const deleteStage = async (id: string) => {
    await supabase.from('pipeline_stages').delete().eq('id', id);
    toast({ title: 'Stage deleted' });
    fetchStages();
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent, pipeline: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const pipelineStages = stages.filter(s => s.pipeline === pipeline);
    const oldIndex = pipelineStages.findIndex(s => s.id === active.id);
    const newIndex = pipelineStages.findIndex(s => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(pipelineStages, oldIndex, newIndex);

    // Optimistic update
    const otherStages = stages.filter(s => s.pipeline !== pipeline);
    const updatedReordered = reordered.map((s, i) => ({ ...s, position: i }));
    setStages([...otherStages, ...updatedReordered].sort((a, b) => a.pipeline.localeCompare(b.pipeline) || a.position - b.position));

    // Persist all positions
    const updates = updatedReordered.map(s =>
      supabase.from('pipeline_stages').update({ position: s.position }).eq('id', s.id)
    );
    await Promise.all(updates);
    toast({ title: 'Stage order updated' });
  }, [stages, toast]);

  const opsStages = stages.filter(s => s.pipeline === 'ops');
  const salesStages = stages.filter(s => s.pipeline === 'sales');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          Pipeline Stages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Stage */}
        <div className="space-y-3 p-4 border border-dashed border-border rounded-lg">
          <Label>Add New Stage</Label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="Stage Name (e.g., follow_up)"
              value={newStage.name}
              onChange={(e) => setNewStage(p => ({ ...p, name: e.target.value }))}
            />
            <Input
              placeholder="Display Label"
              value={newStage.label}
              onChange={(e) => setNewStage(p => ({ ...p, label: e.target.value }))}
            />
            <Select value={newStage.pipeline} onValueChange={(v) => setNewStage(p => ({ ...p, pipeline: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ops">Operational</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newStage.color} onValueChange={(v) => setNewStage(p => ({ ...p, color: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className={`px-2 py-0.5 rounded ${c.value}`}>{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addStage} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Stage
          </Button>
        </div>

        {/* Operational Pipeline */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-muted-foreground">Operational Pipeline</h4>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, 'ops')}
          >
            <SortableContext items={opsStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {opsStages.map((stage) => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    onUpdate={updateStage}
                    onDelete={deleteStage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Sales Pipeline */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-muted-foreground">Sales Pipeline</h4>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, 'sales')}
          >
            <SortableContext items={salesStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {salesStages.map((stage) => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    onUpdate={updateStage}
                    onDelete={deleteStage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableStageRow({
  stage,
  onUpdate,
  onDelete,
}: {
  stage: PipelineStage;
  onUpdate: (id: string, updates: Partial<PipelineStage>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(stage.label);
  const [color, setColor] = useState(stage.color);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onUpdate(stage.id, { label, color });
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {editing ? (
        <>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 h-8"
          />
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colorOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <span className={`px-2 py-0.5 rounded text-xs ${c.value}`}>{c.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={handleSave}>
            <Save className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <span className={`px-2 py-0.5 rounded text-sm flex-1 ${stage.color}`}>
            {stage.label}
          </span>
          <Badge variant="outline" className="text-xs">
            {stage.name}
          </Badge>
          {stage.is_system && (
            <Badge variant="secondary" className="text-xs">System</Badge>
          )}
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
          {!stage.is_system && (
            <Button size="sm" variant="ghost" onClick={() => onDelete(stage.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
