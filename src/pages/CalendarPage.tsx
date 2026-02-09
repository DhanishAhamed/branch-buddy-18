import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type EventType = 'task' | 'followup' | 'site_visit';
type ViewMode = 'week' | 'month';

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

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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
  });
  const { user } = useAuth();
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

  useEffect(() => {
    if (user) fetchEvents();
  }, [user, currentWeekStart, currentMonth, viewMode]);

  const fetchEvents = async () => {
    let startISO: string, endISO: string;

    if (viewMode === 'week') {
      startISO = startOfDay(currentWeekStart).toISOString();
      endISO = endOfDay(addDays(currentWeekStart, 6)).toISOString();
    } else {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const calEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 0 }), 6);
      startISO = startOfDay(calStart).toISOString();
      endISO = endOfDay(calEnd).toISOString();
    }

    const results: CalendarEvent[] = [];

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .gte('scheduled_at', startISO)
      .lte('scheduled_at', endISO)
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

    setEvents(results);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !user) return;
    const startDate = new Date(`${newEvent.date}T${newEvent.startTime}`);

    const { error } = await supabase.from('tasks').insert({
      title: newEvent.title,
      description: newEvent.description || null,
      scheduled_at: startDate.toISOString(),
      user_id: user.id,
      is_completed: false,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to create event', variant: 'destructive' });
    } else {
      toast({ title: 'Event created' });
      setIsCreateOpen(false);
      setNewEvent({ title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00', endTime: '10:00', type: 'task' });
      fetchEvents();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: CalendarEvent) => {
    if (event.sourceTable !== 'tasks') return; // Only tasks can be dragged
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

    // Optimistic update
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === dragEvent.id
          ? {
              ...ev,
              start: newStart,
              end: new Date(newStart.getTime() + differenceInMinutes(ev.end, ev.start) * 60000),
            }
          : ev
      )
    );

    const { error } = await supabase
      .from('tasks')
      .update({ scheduled_at: newStart.toISOString() })
      .eq('id', dragEvent.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to reschedule', variant: 'destructive' });
      fetchEvents(); // revert
    } else {
      toast({ title: 'Event rescheduled' });
    }

    setDragEvent(null);
  };

  const handleDragEnd = () => {
    setDragEvent(null);
    setDragOverSlot(null);
  };

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    return events.filter((e) => isSameDay(e.start, day) && getHours(e.start) === hour);
  };

  const getEventsForDay = (day: Date) => events.filter((e) => isSameDay(e.start, day));

  const getEventStyle = (event: CalendarEvent) => {
    const minuteOffset = getMinutes(event.start);
    const duration = differenceInMinutes(event.end, event.start);
    return {
      top: `${(minuteOffset / 60) * 100}%`,
      height: `${Math.max((duration / 60) * 100, 25)}%`,
    };
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
        />
      )}

      {/* Create Event Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={!newEvent.title}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Week View Component ────────────────────────────────────────────────────────
function WeekView({
  weekDays,
  events,
  getEventsForDayAndHour,
  getEventStyle,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragEvent,
  dragOverSlot,
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
}) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[800px]">
        {/* Day headers */}
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

        {/* Time slots */}
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
                  onDragLeave={() => {}}
                >
                  {dayEvents.map((event) => {
                    const colors = EVENT_COLORS[event.type];
                    const style = getEventStyle(event);
                    const isDraggable = event.sourceTable === 'tasks';
                    return (
                      <div
                        key={event.id}
                        draggable={isDraggable}
                        onDragStart={(e) => {
                          if (isDraggable) {
                            e.dataTransfer.effectAllowed = 'move';
                            onDragStart(event);
                          }
                        }}
                        onDragEnd={onDragEnd}
                        className={cn(
                          'absolute left-0.5 right-0.5 rounded-md border-l-[3px] px-1.5 py-0.5 overflow-hidden transition-opacity hover:opacity-80',
                          colors.bg,
                          colors.border,
                          event.is_completed && 'opacity-50 line-through',
                          isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
                          dragEvent?.id === event.id && 'opacity-40'
                        )}
                        style={style}
                        title={`${event.title}\n${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}${isDraggable ? '\nDrag to reschedule' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          {isDraggable && <GripVertical className="h-2.5 w-2.5 shrink-0 opacity-50" />}
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

// ─── Month View Component ───────────────────────────────────────────────────────
function MonthView({
  monthDays,
  currentMonth,
  events,
  getEventsForDay,
  onDayClick,
}: {
  monthDays: Date[];
  currentMonth: Date;
  events: CalendarEvent[];
  getEventsForDay: (day: Date) => CalendarEvent[];
  onDayClick: (day: Date) => void;
}) {
  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex-1 overflow-auto p-4">
      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {weekDayLabels.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-muted-foreground py-2">
            {label}
          </div>
        ))}
      </div>

      {/* Month grid */}
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
              <p
                className={cn(
                  'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                  isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                )}
              >
                {format(day, 'd')}
              </p>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const colors = EVENT_COLORS[event.type];
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'text-[10px] px-1 py-0.5 rounded truncate font-medium border-l-2',
                        colors.bg,
                        colors.border,
                        colors.text
                      )}
                    >
                      {event.title}
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
