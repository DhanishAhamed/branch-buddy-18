import { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  getHours,
  getMinutes,
  differenceInMinutes,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type EventType = 'task' | 'followup' | 'site_visit';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  type: EventType;
  is_completed?: boolean;
  lead_name?: string;
}

const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string }> = {
  task: { bg: 'bg-blue-500/15', border: 'border-l-blue-500', text: 'text-blue-700 dark:text-blue-300' },
  followup: { bg: 'bg-amber-500/15', border: 'border-l-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  site_visit: { bg: 'bg-emerald-500/15', border: 'border-l-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
};

const EVENT_LABELS: Record<EventType, string> = {
  task: 'Task',
  followup: 'Follow-up',
  site_visit: 'Site Visit',
};

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

export default function CalendarPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    type: 'task' as EventType,
  });
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  useEffect(() => {
    if (user) fetchEvents();
  }, [user, currentWeekStart]);

  const fetchEvents = async () => {
    const weekEnd = addDays(currentWeekStart, 7);
    const startISO = startOfDay(currentWeekStart).toISOString();
    const endISO = endOfDay(weekEnd).toISOString();

    const results: CalendarEvent[] = [];

    // 1. Tasks (only user's own tasks — RLS enforced)
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
      });
    });

    // 2. Follow-ups from call_notes
    const { data: followups } = await supabase
      .from('call_notes')
      .select('id, followup_at, notes, lead_id')
      .not('followup_at', 'is', null)
      .gte('followup_at', startISO)
      .lte('followup_at', endISO)
      .order('followup_at');

    if (followups && followups.length > 0) {
      const leadIds = [...new Set(followups.map((f) => f.lead_id))];
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name')
        .in('id', leadIds);
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
        });
      });
    }

    // 3. Site visits from leads
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
        id: `sv-${sv.id}`,
        title: `Site Visit: ${sv.name}`,
        start,
        end: new Date(start.getTime() + 60 * 60000),
        type: 'site_visit',
        lead_name: sv.name,
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

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    return events.filter((e) => {
      if (!isSameDay(e.start, day)) return false;
      const eventHour = getHours(e.start);
      return eventHour === hour;
    });
  };

  const getEventStyle = (event: CalendarEvent) => {
    const minuteOffset = getMinutes(event.start);
    const duration = differenceInMinutes(event.end, event.start);
    const topPercent = (minuteOffset / 60) * 100;
    const heightPercent = (duration / 60) * 100;
    return {
      top: `${topPercent}%`,
      height: `${Math.max(heightPercent, 25)}%`,
    };
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 0 }));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">
            {format(currentWeekStart, 'MMMM yyyy')}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
              setSelectedDate(new Date());
            }}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Mini calendar picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
              />
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
      </div>

      {/* Week grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-10 bg-background border-b border-border">
            <div className="p-2 text-xs text-muted-foreground" />
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'text-center py-2 border-l border-border',
                    isToday && 'bg-primary/5'
                  )}
                >
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(day, 'EEE')}
                  </p>
                  <p
                    className={cn(
                      'text-lg font-semibold',
                      isToday
                        ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto'
                        : 'text-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time slots */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 min-h-[60px]"
            >
              <div className="p-1 text-[10px] text-muted-foreground text-right pr-2 pt-0 -translate-y-2">
                {format(new Date(2000, 0, 1, hour), 'h a')}
              </div>
              {weekDays.map((day) => {
                const dayEvents = getEventsForDayAndHour(day, hour);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'border-l border-border/50 relative',
                      isToday && 'bg-primary/[0.02]'
                    )}
                  >
                    {dayEvents.map((event) => {
                      const colors = EVENT_COLORS[event.type];
                      const style = getEventStyle(event);
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'absolute left-0.5 right-0.5 rounded-md border-l-[3px] px-1.5 py-0.5 overflow-hidden cursor-pointer transition-opacity hover:opacity-80',
                            colors.bg,
                            colors.border,
                            event.is_completed && 'opacity-50 line-through'
                          )}
                          style={style}
                          title={`${event.title}\n${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}`}
                        >
                          <p className={cn('text-[11px] font-medium truncate', colors.text)}>
                            {event.title}
                          </p>
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
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={(v) => setNewEvent({ ...newEvent, type: v as EventType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Input
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={!newEvent.title}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
