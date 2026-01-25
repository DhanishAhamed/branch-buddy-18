import { useState, useEffect, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, CheckCircle2, MoreVertical, Plus } from 'lucide-react';
import {
  MiniCalendar,
  MiniCalendarHeader,
  MiniCalendarDay,
  MiniCalendarDays,
} from '@/components/kibo-ui/mini-calendar';

interface Task {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  is_completed: boolean;
}

export function ScheduleWidget() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [upcomingTask, setUpcomingTask] = useState<Task | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAllTasks();
      fetchUpcomingTask();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, selectedDate]);

  const fetchAllTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user?.id)
      .order('scheduled_at', { ascending: true });
    
    if (data) {
      setAllTasks(data);
    }
  };

  const fetchTasks = async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user?.id)
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString())
      .order('scheduled_at', { ascending: true });
    
    if (data) {
      setTasks(data);
    }
  };

  const fetchUpcomingTask = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_completed', false)
      .gt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1);
    
    if (data && data.length > 0) {
      setUpcomingTask(data[0]);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    await supabase
      .from('tasks')
      .update({ is_completed: completed })
      .eq('id', taskId);
    
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, is_completed: completed } : t)
    );
  };

  const tasksOnDates = useMemo(() => {
    return allTasks.map(task => new Date(task.scheduled_at));
  }, [allTasks]);

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5 text-primary" />
          Schedule
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini Calendar */}
        <MiniCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          tasksOnDates={tasksOnDates}
        >
          <MiniCalendarHeader />
          <MiniCalendarDays>
            {(date) => <MiniCalendarDay date={date} key={date.toISOString()} />}
          </MiniCalendarDays>
        </MiniCalendar>

        {/* Tasks for selected day */}
        <div className="min-h-[100px] pt-2 border-t border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">
            {isSameDay(selectedDate, new Date()) ? "Today's Tasks" : format(selectedDate, 'MMM d, yyyy')}
          </p>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                No tasks scheduled
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id, !task.is_completed)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    task.is_completed 
                      ? 'bg-muted/30 border-border/50' 
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>{format(new Date(task.scheduled_at), 'h:mm a')}</span>
                  </div>
                  <p className={`text-sm font-medium ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule Meeting Button */}
        <Button variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>

        {/* Upcoming Next */}
        {upcomingTask && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">
              Upcoming Next
            </p>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center bg-muted/30 rounded-lg px-2 py-1.5 min-w-[40px]">
                <span className="text-[10px] uppercase text-muted-foreground">
                  {format(new Date(upcomingTask.scheduled_at), 'MMM')}
                </span>
                <span className="text-lg font-bold text-foreground">
                  {format(new Date(upcomingTask.scheduled_at), 'd')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {upcomingTask.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(upcomingTask.scheduled_at), 'h:mm a')} - {format(new Date(new Date(upcomingTask.scheduled_at).getTime() + 30 * 60000), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
