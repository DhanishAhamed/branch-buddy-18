import { useEffect, useState } from 'react';
import { Bell, UserPlus, Calendar, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'new_lead' | 'task_due' | 'follow_up';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationBell() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !profile?.branch_id) return;

    // Fetch initial notifications (recent leads and overdue tasks)
    fetchNotifications();

    // Subscribe to new leads in real-time
    const leadsChannel = supabase
      .channel('new-leads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `branch_id=eq.${profile.branch_id}`,
        },
        (payload) => {
          const newLead = payload.new as { id: string; name: string; created_at: string };
          setNotifications((prev) => [
            {
              id: `lead-${newLead.id}`,
              type: 'new_lead',
              title: 'New Lead Added',
              description: `${newLead.name} just submitted an inquiry`,
              timestamp: new Date(newLead.created_at),
              read: false,
            },
            ...prev.slice(0, 9), // Keep max 10 notifications
          ]);
        }
      )
      .subscribe();

    // Subscribe to new tasks
    const tasksChannel = supabase
      .channel('new-tasks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newTask = payload.new as { id: string; title: string; created_at: string };
          setNotifications((prev) => [
            {
              id: `task-${newTask.id}`,
              type: 'task_due',
              title: 'New Task Created',
              description: newTask.title,
              timestamp: new Date(newTask.created_at),
              read: false,
            },
            ...prev.slice(0, 9),
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [user, profile]);

  const fetchNotifications = async () => {
    if (!user || !profile?.branch_id) return;

    const notificationList: Notification[] = [];

    // Get recent leads (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id, name, created_at')
      .eq('branch_id', profile.branch_id)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentLeads) {
      recentLeads.forEach((lead) => {
        notificationList.push({
          id: `lead-${lead.id}`,
          type: 'new_lead',
          title: 'New Lead',
          description: `${lead.name} submitted an inquiry`,
          timestamp: new Date(lead.created_at),
          read: false,
        });
      });
    }

    // Get overdue tasks
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id, title, scheduled_at')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .lt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(5);

    if (overdueTasks) {
      overdueTasks.forEach((task) => {
        notificationList.push({
          id: `task-${task.id}`,
          type: 'task_due',
          title: 'Task Overdue',
          description: task.title,
          timestamp: new Date(task.scheduled_at),
          read: false,
        });
      });
    }

    // Sort by timestamp
    notificationList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setNotifications(notificationList.slice(0, 10));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
    setOpen(false);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_lead':
        return UserPlus;
      case 'task_due':
        return Calendar;
      case 'follow_up':
        return AlertCircle;
      default:
        return Bell;
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'new_lead':
        return 'text-primary bg-primary/10';
      case 'task_due':
        return 'text-destructive bg-destructive/10';
      case 'follow_up':
        return 'text-amber-500 bg-amber-500/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-popover border-border z-50">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="text-sm font-semibold p-0">
            Notifications
          </DropdownMenuLabel>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
              Clear all
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`flex items-start gap-3 p-3 cursor-pointer ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getIconColor(
                      notification.type
                    )}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      {!notification.read && (
                        <Badge variant="secondary" className="h-1.5 w-1.5 p-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
