import { useState, useEffect, useMemo } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, CheckCircle2, MoreVertical, Plus, ChevronLeft, ChevronRight, Phone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type EventType = 'task' | 'followup' | 'site_visit';

interface ScheduleEvent {
  id: string;
  title: string;
  scheduled_at: string;
  type: EventType;
  is_completed?: boolean;
}

const TYPE_STYLES: Record<EventType, { badge: string; label: string }> = {
  task: { badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30', label: 'Task' },
  followup: { badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', label: 'Follow-up' },
  site_visit: { badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', label: 'Site Visit' },
};

const TYPE_ICONS: Record<EventType, React.ReactNode> = {
  task: <CheckCircle2 className="h-3 w-3" />,
  followup: <Phone className="h-3 w-3" />,
  site_visit: <MapPin className="h-3 w-3" />,
};

export function ScheduleWidget() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateOffset, setDateOffset] = useState(0);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [allEvents, setAllEvents] = useState<ScheduleEvent[]>([]);
  const [upcomingEvent, setUpcomingEvent] = useState<ScheduleEvent | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const visibleDates = useMemo(() => {
    const baseDate = addDays(new Date(), dateOffset);
    return Array.from({ length: 5 }, (_, i) => addDays(baseDate, i));
  }, [dateOffset]);

  useEffect(() => {
    if (user) {
      fetchAllEvents();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDayEvents();
    }
  }, [user, selectedDate, allEvents]);

  const fetchAllEvents = async () => {
    const combined: ScheduleEvent[] = [];

    // Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user?.id)
      .order('scheduled_at', { ascending: true });

    tasks?.forEach((t) =>
      combined.push({ id: t.id, title: t.title, scheduled_at: t.scheduled_at, type: 'task', is_completed: t.is_completed })
    );

    // Follow-ups
    const { data: followups } = await supabase
      .from('call_notes')
      .select('id, followup_at, notes, lead_id')
      .eq('user_id', user?.id!)
      .not('followup_at', 'is', null)
      .order('followup_at');

    if (followups && followups.length > 0) {
      const leadIds = [...new Set(followups.map((f) => f.lead_id))];
      const { data: leads } = await supabase.from('leads').select('id, name').in('id', leadIds);
      const leadMap = new Map(leads?.map((l) => [l.id, l.name]) || []);

      followups.forEach((f) =>
        combined.push({
          id: f.id,
          title: `Follow-up: ${leadMap.get(f.lead_id) || 'Lead'}`,
          scheduled_at: f.followup_at!,
          type: 'followup',
        })
      );
    }

    // Site visits
    const { data: siteVisits } = await supabase
      .from('leads')
      .select('id, name, site_visit_time')
      .not('site_visit_time', 'is', null)
      .order('site_visit_time');

    siteVisits?.forEach((sv) =>
      combined.push({
        id: `sv-${sv.id}`,
        title: `Site Visit: ${sv.name}`,
        scheduled_at: sv.site_visit_time!,
        type: 'site_visit',
      })
    );

    combined.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    setAllEvents(combined);

    // Upcoming
    const now = new Date();
    const upcoming = combined.find((e) => new Date(e.scheduled_at) > now && !e.is_completed);
    setUpcomingEvent(upcoming || null);
  };

  const fetchDayEvents = () => {
    const dayEvents = allEvents.filter((e) => isSameDay(new Date(e.scheduled_at), selectedDate));
    setEvents(dayEvents);
  };

  const toggleTask = async (eventId: string, completed: boolean) => {
    await supabase.from('tasks').update({ is_completed: completed }).eq('id', eventId);
    setAllEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, is_completed: completed } : e))
    );
  };

  const hasEventOnDate = (date: Date) => {
    return allEvents.some((e) => isSameDay(new Date(e.scheduled_at), date));
  };

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5 text-primary" />
          Schedule
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/calendar')}>
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 5-Day Calendar Strip */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setDateOffset((prev) => prev - 5)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-1 justify-between gap-1">
            {visibleDates.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              const hasEvent = hasEventOnDate(date);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`relative flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all ${
                    isSelected ? 'bg-primary text-primary-foreground shadow-md' : isToday ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {format(date, 'MMM')}
                  </span>
                  <span className="text-lg font-bold">{format(date, 'd')}</span>
                  {hasEvent && (
                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                  )}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setDateOffset((prev) => prev + 5)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Events for selected day */}
        <div className="min-h-[100px] pt-2 border-t border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">
            {isSameDay(selectedDate, new Date()) ? "Today's Schedule" : format(selectedDate, 'MMM d, yyyy')}
          </p>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No events scheduled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => {
                const style = TYPE_STYLES[event.type];
                return (
                  <div
                    key={event.id}
                    onClick={() => event.type === 'task' && toggleTask(event.id, !event.is_completed)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      event.is_completed ? 'bg-muted/30 border-border/50' : 'bg-card border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">{format(new Date(event.scheduled_at), 'h:mm a')}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${style.badge}`}>
                        {TYPE_ICONS[event.type]}
                        {style.label}
                      </Badge>
                    </div>
                    <p className={`text-sm font-medium ${event.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {event.title}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View Calendar Button */}
        <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/calendar')}>
          <Calendar className="h-4 w-4" />
          View Full Calendar
        </Button>

        {/* Upcoming Next */}
        {upcomingEvent && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">Upcoming Next</p>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center bg-muted/30 rounded-lg px-2 py-1.5 min-w-[40px]">
                <span className="text-[10px] uppercase text-muted-foreground">{format(new Date(upcomingEvent.scheduled_at), 'MMM')}</span>
                <span className="text-lg font-bold text-foreground">{format(new Date(upcomingEvent.scheduled_at), 'd')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{upcomingEvent.title}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{format(new Date(upcomingEvent.scheduled_at), 'h:mm a')}</p>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_STYLES[upcomingEvent.type].badge}`}>
                    {TYPE_STYLES[upcomingEvent.type].label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
