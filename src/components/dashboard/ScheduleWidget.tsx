import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from 'lucide-react';

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
  const { user } = useAuth();
  
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, selectedDate]);

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

  const toggleTask = async (taskId: string, completed: boolean) => {
    await supabase
      .from('tasks')
      .update({ is_completed: completed })
      .eq('id', taskId);
    
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, is_completed: completed } : t)
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar Strip */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center justify-center min-w-[48px] h-16 rounded-xl transition-all ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground' 
                    : isToday 
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted/30 text-foreground hover:bg-muted/50'
                }`}
              >
                <span className="text-xs font-medium">
                  {format(day, 'EEE')}
                </span>
                <span className={`text-lg font-bold ${isSelected ? '' : ''}`}>
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No tasks scheduled for this day
            </p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={(checked) => toggleTask(task.id, checked as boolean)}
                  className="mt-1 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {format(new Date(task.scheduled_at), 'HH:mm')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(task.scheduled_at), 'MMM d')}
                    </span>
                  </div>
                  <p className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
