import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, UserPlus, Calendar, AlertCircle, Clock, MapPin, CheckCheck, Settings } from 'lucide-react';
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
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  link: string | null;
  scheduled_for: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Subscribe to new notifications in real-time
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    // Also fetch recent leads as notifications (for admins/staff)
    if (profile?.branch_id) {
      const leadsChannel = supabase
        .channel('new-leads-notif')
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
            const leadNotif: Notification = {
              id: `lead-${newLead.id}`,
              title: 'New Lead Added',
              message: `${newLead.name} submitted an inquiry`,
              type: 'new_lead',
              is_read: false,
              link: null,
              scheduled_for: null,
              created_at: newLead.created_at,
            };
            setNotifications((prev) => [leadNotif, ...prev].slice(0, 20));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(leadsChannel);
      };
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const fetchNotifications = async () => {
    if (!user) return;

    // Fetch from notifications table - show due notifications and recent ones
    const { data: dbNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(15);

    const allNotifs: Notification[] = [];

    if (dbNotifs) {
      allNotifs.push(...(dbNotifs as Notification[]));
    }

    // Also get overdue tasks as notifications
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
        // Avoid duplicates
        if (!allNotifs.some(n => n.id === `task-overdue-${task.id}`)) {
          allNotifs.push({
            id: `task-overdue-${task.id}`,
            title: 'Task Overdue',
            message: task.title,
            type: 'task_overdue',
            is_read: false,
            link: null,
            scheduled_for: task.scheduled_at,
            created_at: task.scheduled_at,
          });
        }
      });
    }

    // Sort by date, most recent first
    allNotifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(allNotifs.slice(0, 20));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    // If it's a DB notification (UUID format), update in DB
    if (id.match(/^[0-9a-f-]{36}$/)) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_lead':
        return UserPlus;
      case 'task_overdue':
        return AlertCircle;
      case 'followup_reminder':
        return Clock;
      case 'site_visit_reminder':
        return MapPin;
      case 'task_reminder':
        return Calendar;
      case 'lead_assigned':
        return UserPlus;
      default:
        return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'new_lead':
        return 'text-primary bg-primary/10';
      case 'task_overdue':
        return 'text-destructive bg-destructive/10';
      case 'followup_reminder':
        return 'text-amber-500 bg-amber-500/10';
      case 'site_visit_reminder':
        return 'text-emerald-500 bg-emerald-500/10';
      case 'task_reminder':
        return 'text-blue-500 bg-blue-500/10';
      case 'lead_assigned':
        return 'text-purple-500 bg-purple-500/10';
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
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-xs">
                <CheckCheck className="h-3 w-3 mr-1" />
                Read all
              </Button>
            )}
          </div>
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
                    !notification.is_read ? 'bg-primary/5' : ''
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
                      {!notification.is_read && (
                        <Badge variant="secondary" className="h-1.5 w-1.5 p-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => { setOpen(false); navigate('/notifications/preferences'); }}
          className="flex items-center gap-2 p-3 cursor-pointer"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Notification Settings</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
