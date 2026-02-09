import { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  getHours,
  getMinutes,
  differenceInMinutes,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, GripVertical, Repeat, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type EventType = 'task' | 'followup' | 'site_visit';
type ViewMode = 'week' | 'month';
type RecurrenceRule = 'daily' | 'weekly' | 'monthly' | null;

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  type: EventType;
  is_completed?: boolean;
  lead_name?: string;
  sourceTable?: 'tasks' | 'call_notes' | 'leads';
  recurrence_rule?: string | null;
}

const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string; dot: string }> = {
  task: { bg: 'bg-blue-500/15', border: 'border-l-blue-500', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  followup: { bg: 'bg-amber-500/15', border: 'border-l-amber-500', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  site_visit: { bg: 'bg-emerald-500/15', border: 'border-l-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
};

const EVENT_LABELS: Record<EventType, string> = {
  task: 'Task',
  followup: 'Follow-up',
  site_visit: 'Site Visit',
};

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

// Generate recurring event occurrences within a date range
function expandRecurringEvents(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const expanded: CalendarEvent[] = [];

  for (const event of events) {
    expanded.push(event);

    if (event.recurrence_rule && event.sourceTable === 'tasks') {
      const duration = differenceInMinutes(event.end, event.start);
      let current = new Date(event.start);

      for (let i = 0; i < 100; i++) {
        if (event.recurrence_rule === 'daily') {
          current = addDays(current, 1);
        } else if (event.recurrence_rule === 'weekly') {
          current = addDays(current, 7);
        } else if (event.recurrence_rule === 'monthly') {
          current = addMonths(current, 1);
        } else {
          break;
        }

        if (current > rangeEnd) break;
        if (current < rangeStart) continue;

        expanded.push({
          ...event,
          id: `${event.id}-recur-${i}`,
          start: new Date(current),
          end: new Date(current.getTime() + duration * 60000),
        });
      }
    }
  }

  return expanded;
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rawEvents, setRawEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dragEvent, setDragEvent] = useState<CalendarEvent | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ day: Date; hour: number } | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    type: 'task' as EventType,
    isRecurring: false,
    recurrenceRule: 'weekly' as RecurrenceRule,
    recurrenceEnd: '',
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '09:00',
  });
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 0 }), 6);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Compute visible date range
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === 'week') {
      return {
        rangeStart: startOfDay(currentWeekStart),
        rangeEnd: endOfDay(addDays(currentWeekStart, 6)),
      };
    } else {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      return {
        rangeStart: startOfDay(startOfWeek(monthStart, { weekStartsOn: 0 })),
        rangeEnd: endOfDay(addDays(startOfWeek(monthEnd, { weekStartsOn: 0 }), 6)),
      };
    }
  }, [viewMode, currentWeekStart, currentMonth]);

  // Expand recurring events
  const events = useMemo(
    () => expandRecurringEvents(rawEvents, rangeStart, rangeEnd),
    [rawEvents, rangeStart, rangeEnd]
  );

  useEffect(() => {
    if (user) fetchEvents();
  }, [user, currentWeekStart, currentMonth, viewMode]);

  const fetchEvents = async () => {
    const startISO = rangeStart.toISOString();
    const endISO = rangeEnd.toISOString();

    const results: CalendarEvent[] = [];

    // Fetch tasks — also include recurring ones that started before range
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .or(`and(scheduled_at.gte.${startISO},scheduled_at.lte.${endISO}),recurrence_rule.not.is.null`)
      .order('scheduled_at');

    tasks?.forEach((t) => {
      const start = new Date(t.scheduled_at);
      results.push({
        id: t.id,
        title: t.title,
        description: t.description,
        start,
        end: new Date(start.getTime() + 30 * 60000),
        type: 'task',
        is_completed: t.is_completed,
        sourceTable: 'tasks',
        recurrence_rule: t.recurrence_rule,
      });
    });

    const { data: followups } = await supabase
      .from('call_notes')
      .select('id, followup_at, notes, lead_id')
      .not('followup_at', 'is', null)
      .gte('followup_at', startISO)
      .lte('followup_at', endISO)
      .order('followup_at');

    if (followups && followups.length > 0) {
      const leadIds = [...new Set(followups.map((f) => f.lead_id))];
      const { data: leads } = await supabase.from('leads').select('id, name').in('id', leadIds);
      const leadMap = new Map(leads?.map((l) => [l.id, l.name]) || []);

      followups.forEach((f) => {
        const start = new Date(f.followup_at!);
        results.push({
          id: f.id,
          title: `Follow-up: ${leadMap.get(f.lead_id) || 'Lead'}`,
          description: f.notes,
          start,
          end: new Date(start.getTime() + 30 * 60000),
          type: 'followup',
          lead_name: leadMap.get(f.lead_id) || undefined,
          sourceTable: 'call_notes',
        });
      });
    }

    const { data: siteVisits } = await supabase
      .from('leads')
      .select('id, name, site_visit_time')
      .not('site_visit_time', 'is', null)
      .gte('site_visit_time', startISO)
      .lte('site_visit_time', endISO)
      .order('site_visit_time');

    siteVisits?.forEach((sv) => {
      const start = new Date(sv.site_visit_time!);
      results.push({
        id: sv.id,
        title: `Site Visit: ${sv.name}`,
        start,
        end: new Date(start.getTime() + 60 * 60000),
        type: 'site_visit',
        lead_name: sv.name,
        sourceTable: 'leads',
      });
    });

    setRawEvents(results);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !user) return;
    const startDate = new Date(`${newEvent.date}T${newEvent.startTime}`);

    const insertData: any = {
      title: newEvent.title,
      description: newEvent.description || null,
      scheduled_at: startDate.toISOString(),
      user_id: user.id,
      is_completed: false,
      workspace_id: activeWorkspace?.id || null,
    };

    if (newEvent.isRecurring && newEvent.recurrenceRule) {
      insertData.recurrence_rule = newEvent.recurrenceRule;
      if (newEvent.recurrenceEnd) {
        insertData.recurrence_end = newEvent.recurrenceEnd;
      }
    }

    const { error } = await supabase.from('tasks').insert(insertData);

    if (error) {
      toast({ title: 'Error', description: 'Failed to create event', variant: 'destructive' });
    } else {
      toast({ title: 'Event created' });
      setIsCreateOpen(false);
      setNewEvent({ title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00', endTime: '10:00', type: 'task', isRecurring: false, recurrenceRule: 'weekly', recurrenceEnd: '' });
      fetchEvents();
    }
  };

  // Drag and drop
  const handleDragStart = (event: CalendarEvent) => {
    if (event.sourceTable !== 'tasks' || event.id.includes('-recur-')) return;
    setDragEvent(event);
  };

  const handleDragOver = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    setDragOverSlot({ day, hour });
  };

  const handleDrop = async (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!dragEvent || dragEvent.sourceTable !== 'tasks') {
      setDragEvent(null);
      return;
    }

    const minutes = getMinutes(dragEvent.start);
    const newStart = new Date(day);
    newStart.setHours(hour, minutes, 0, 0);

    setRawEvents((prev) =>
      prev.map((ev) =>
        ev.id === dragEvent.id
          ? { ...ev, start: newStart, end: new Date(newStart.getTime() + differenceInMinutes(ev.end, ev.start) * 60000) }
          : ev
      )
    );

    const { error } = await supabase
      .from('tasks')
      .update({ scheduled_at: newStart.toISOString() })
      .eq('id', dragEvent.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to reschedule', variant: 'destructive' });
      fetchEvents();
    } else {
      toast({ title: 'Event rescheduled' });
    }
    setDragEvent(null);
  };

  const handleDragEnd = () => {
    setDragEvent(null);
    setDragOverSlot(null);
  };

  const getEventsForDayAndHour = (day: Date, hour: number) =>
    events.filter((e) => isSameDay(e.start, day) && getHours(e.start) === hour);

  const getEventsForDay = (day: Date) => events.filter((e) => isSameDay(e.start, day));

  const getEventStyle = (event: CalendarEvent) => {
    const minuteOffset = getMinutes(event.start);
    const duration = differenceInMinutes(event.end, event.start);
    return {
      top: `${(minuteOffset / 60) * 100}%`,
      height: `${Math.max((duration / 60) * 100, 25)}%`,
    };
  };

  // Event click → open detail modal
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEditForm({
      title: event.title,
      description: event.description || '',
      date: format(event.start, 'yyyy-MM-dd'),
      startTime: format(event.start, 'HH:mm'),
    });
    setIsEditing(false);
    setIsDetailOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedEvent || selectedEvent.sourceTable !== 'tasks') return;
    const realId = selectedEvent.id.includes('-recur-') ? selectedEvent.id.split('-recur-')[0] : selectedEvent.id;

    const startDate = new Date(`${editForm.date}T${editForm.startTime}`);
    const { error } = await supabase
      .from('tasks')
      .update({
        title: editForm.title,
        description: editForm.description || null,
        scheduled_at: startDate.toISOString(),
      })
      .eq('id', realId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update event', variant: 'destructive' });
    } else {
      toast({ title: 'Event updated' });
      setIsDetailOpen(false);
      fetchEvents();
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    const realId = selectedEvent.id.includes('-recur-') ? selectedEvent.id.split('-recur-')[0] : selectedEvent.id;

    if (selectedEvent.sourceTable === 'tasks') {
      const { error } = await supabase.from('tasks').delete().eq('id', realId);
      if (error) {
        toast({ title: 'Error', description: 'Failed to delete event', variant: 'destructive' });
        return;
      }
    } else if (selectedEvent.sourceTable === 'call_notes') {
      const { error } = await supabase.from('call_notes').update({ followup_at: null }).eq('id', realId);
      if (error) {
        toast({ title: 'Error', description: 'Failed to remove follow-up', variant: 'destructive' });
        return;
      }
    } else if (selectedEvent.sourceTable === 'leads') {
      const { error } = await supabase.from('leads').update({ site_visit_time: null }).eq('id', realId);
      if (error) {
        toast({ title: 'Error', description: 'Failed to remove site visit', variant: 'destructive' });
        return;
      }
    }

    toast({ title: 'Event deleted' });
    setIsDeleteConfirmOpen(false);
    setIsDetailOpen(false);
    fetchEvents();
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 0 }));
      setCurrentMonth(date);
    }
  };

  const navigatePrev = () => {
    if (viewMode === 'week') setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    else setCurrentMonth(subMonths(currentMonth, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'week') setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    else setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const headerTitle = viewMode === 'week'
    ? format(currentWeekStart, 'MMMM yyyy')
    : format(currentMonth, 'MMMM yyyy');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">{headerTitle}</h1>
          <Button variant="ghost" size="sm" onClick={goToday}>Today</Button>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="week" className="text-xs px-3 h-7">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-3 h-7">Month</TabsTrigger>
            </TabsList>
          </Tabs>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} initialFocus />
            </PopoverContent>
          </Popover>

          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
        {(Object.keys(EVENT_COLORS) as EventType[]).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn('h-3 w-3 rounded-sm border-l-2', EVENT_COLORS[type].bg, EVENT_COLORS[type].border)} />
            <span className="text-xs text-muted-foreground">{EVENT_LABELS[type]}</span>
          </div>
        ))}
        <span className="text-[10px] text-muted-foreground ml-auto">Drag tasks to reschedule</span>
      </div>

      {/* Views */}
      {viewMode === 'week' ? (
        <WeekView
          weekDays={weekDays}
          events={events}
          getEventsForDayAndHour={getEventsForDayAndHour}
          getEventStyle={getEventStyle}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          dragEvent={dragEvent}
          dragOverSlot={dragOverSlot}
          onEventClick={handleEventClick}
        />
      ) : (
        <MonthView
          monthDays={monthDays}
          currentMonth={currentMonth}
          events={events}
          getEventsForDay={getEventsForDay}
          onDayClick={(day) => {
            setSelectedDate(day);
            setCurrentWeekStart(startOfWeek(day, { weekStartsOn: 0 }));
            setViewMode('week');
          }}
          onEventClick={handleEventClick}
        />
      )}

      {/* Create Event Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newEvent.type} onValueChange={(v) => setNewEvent({ ...newEvent, type: v as EventType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="site_visit">Site Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} />
              </div>
            </div>

            {/* Recurrence */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  Recurring Event
                </Label>
                <Switch
                  checked={newEvent.isRecurring}
                  onCheckedChange={(v) => setNewEvent({ ...newEvent, isRecurring: v })}
                />
              </div>

              {newEvent.isRecurring && (
                <div className="space-y-3 pl-6">
                  <div>
                    <Label className="text-xs">Repeat</Label>
                    <Select
                      value={newEvent.recurrenceRule || 'weekly'}
                      onValueChange={(v) => setNewEvent({ ...newEvent, recurrenceRule: v as RecurrenceRule })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">End Date (optional)</Label>
                    <Input
                      type="date"
                      value={newEvent.recurrenceEnd}
                      onChange={(e) => setNewEvent({ ...newEvent, recurrenceEnd: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={!newEvent.title}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail / Edit Modal */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => { setIsDetailOpen(open); if (!open) setIsEditing(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && (
                <div className={cn('h-3 w-3 rounded-sm', EVENT_COLORS[selectedEvent.type].dot)} />
              )}
              {isEditing ? 'Edit Event' : 'Event Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && EVENT_LABELS[selectedEvent.type]}
              {selectedEvent?.recurrence_rule && ` · Repeats ${selectedEvent.recurrence_rule}`}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && !isEditing && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <p className="text-sm font-medium text-foreground">{selectedEvent.title}</p>
              </div>
              {selectedEvent.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm text-foreground">{selectedEvent.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm text-foreground">{format(selectedEvent.start, 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <p className="text-sm text-foreground">{format(selectedEvent.start, 'h:mm a')} – {format(selectedEvent.end, 'h:mm a')}</p>
                </div>
              </div>
              {selectedEvent.lead_name && (
                <div>
                  <Label className="text-xs text-muted-foreground">Lead</Label>
                  <p className="text-sm text-foreground">{selectedEvent.lead_name}</p>
                </div>
              )}
              {selectedEvent.is_completed !== undefined && (
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={selectedEvent.is_completed ? 'secondary' : 'default'} className="mt-1">
                    {selectedEvent.is_completed ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {selectedEvent && isEditing && selectedEvent.sourceTable === 'tasks' && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <div className="flex gap-2">
              {!isEditing && selectedEvent?.sourceTable === 'tasks' && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleEditSave} disabled={!editForm.title}>Save</Button>
                </>
              )}
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>Close</Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEvent?.title}"? This action cannot be undone.
              {selectedEvent?.recurrence_rule && ' This will delete all occurrences of this recurring event.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Week View ──────────────────────────────────────────────────────────────────
function WeekView({
  weekDays, events, getEventsForDayAndHour, getEventStyle,
  onDragStart, onDragOver, onDrop, onDragEnd, dragEvent, dragOverSlot, onEventClick,
}: {
  weekDays: Date[];
  events: CalendarEvent[];
  getEventsForDayAndHour: (day: Date, hour: number) => CalendarEvent[];
  getEventStyle: (event: CalendarEvent) => { top: string; height: string };
  onDragStart: (event: CalendarEvent) => void;
  onDragOver: (e: React.DragEvent, day: Date, hour: number) => void;
  onDrop: (e: React.DragEvent, day: Date, hour: number) => void;
  onDragEnd: () => void;
  dragEvent: CalendarEvent | null;
  dragOverSlot: { day: Date; hour: number } | null;
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-10 bg-background border-b border-border">
          <div className="p-2 text-xs text-muted-foreground" />
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={cn('text-center py-2 border-l border-border', isToday && 'bg-primary/5')}>
                <p className="text-xs text-muted-foreground uppercase">{format(day, 'EEE')}</p>
                <p className={cn(
                  'text-lg font-semibold',
                  isToday ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto' : 'text-foreground'
                )}>
                  {format(day, 'd')}
                </p>
              </div>
            );
          })}
        </div>

        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 min-h-[60px]">
            <div className="p-1 text-[10px] text-muted-foreground text-right pr-2 pt-0 -translate-y-2">
              {format(new Date(2000, 0, 1, hour), 'h a')}
            </div>
            {weekDays.map((day) => {
              const dayEvents = getEventsForDayAndHour(day, hour);
              const isToday = isSameDay(day, new Date());
              const isDragOver = dragOverSlot && isSameDay(dragOverSlot.day, day) && dragOverSlot.hour === hour;
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-l border-border/50 relative transition-colors',
                    isToday && 'bg-primary/[0.02]',
                    isDragOver && 'bg-primary/10'
                  )}
                  onDragOver={(e) => onDragOver(e, day, hour)}
                  onDrop={(e) => onDrop(e, day, hour)}
                >
                  {dayEvents.map((event) => {
                    const colors = EVENT_COLORS[event.type];
                    const style = getEventStyle(event);
                    const isDraggable = event.sourceTable === 'tasks' && !event.id.includes('-recur-');
                    const isRecurring = !!event.recurrence_rule;
                    return (
                      <div
                        key={event.id}
                        draggable={isDraggable}
                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        onDragStart={(e) => {
                          if (isDraggable) {
                            e.dataTransfer.effectAllowed = 'move';
                            onDragStart(event);
                          }
                        }}
                        onDragEnd={onDragEnd}
                        className={cn(
                          'absolute left-0.5 right-0.5 rounded-md border-l-[3px] px-1.5 py-0.5 overflow-hidden transition-opacity hover:opacity-80 cursor-pointer',
                          colors.bg, colors.border,
                          event.is_completed && 'opacity-50 line-through',
                          isDraggable && 'active:cursor-grabbing',
                          dragEvent?.id === event.id && 'opacity-40'
                        )}
                        style={style}
                        title={`${event.title}\n${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}${isRecurring ? '\n🔄 Recurring' : ''}${isDraggable ? '\nDrag to reschedule' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          {isDraggable && <GripVertical className="h-2.5 w-2.5 shrink-0 opacity-50" />}
                          {isRecurring && <Repeat className="h-2.5 w-2.5 shrink-0 opacity-60" />}
                          <p className={cn('text-[11px] font-medium truncate', colors.text)}>
                            {event.title}
                          </p>
                        </div>
                        <p className={cn('text-[9px] truncate', colors.text, 'opacity-70')}>
                          {format(event.start, 'h:mm a')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Month View ─────────────────────────────────────────────────────────────────
function MonthView({
  monthDays, currentMonth, events, getEventsForDay, onDayClick, onEventClick,
}: {
  monthDays: Date[];
  currentMonth: Date;
  events: CalendarEvent[];
  getEventsForDay: (day: Date) => CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 mb-1">
        {weekDayLabels.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-muted-foreground py-2">{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr border border-border rounded-lg overflow-hidden" style={{ minHeight: '500px' }}>
        {monthDays.map((day) => {
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                'border-b border-r border-border/50 p-1 min-h-[80px] cursor-pointer transition-colors hover:bg-muted/50',
                !isCurrentMonth && 'bg-muted/20 opacity-50'
              )}
            >
              <p className={cn(
                'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
              )}>
                {format(day, 'd')}
              </p>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const colors = EVENT_COLORS[event.type];
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      className={cn('text-[10px] px-1 py-0.5 rounded truncate font-medium border-l-2 cursor-pointer hover:opacity-80', colors.bg, colors.border, colors.text)}
                    >
                      {event.recurrence_rule && '🔄 '}{event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
