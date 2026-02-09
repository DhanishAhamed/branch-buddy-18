import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bell, Clock, MapPin, UserPlus, Calendar, AlertCircle, Save } from 'lucide-react';

interface NotificationPreferences {
  task_reminders: boolean;
  followup_reminders: boolean;
  site_visit_reminders: boolean;
  new_lead_alerts: boolean;
  lead_assignment_alerts: boolean;
  reminder_timing: string; // '15', '30', '60', '120'
}

const defaultPrefs: NotificationPreferences = {
  task_reminders: true,
  followup_reminders: true,
  site_visit_reminders: true,
  new_lead_alerts: true,
  lead_assignment_alerts: true,
  reminder_timing: '30',
};

export default function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPrefs);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadPreferences();
  }, [user]);

  const loadPreferences = () => {
    const stored = localStorage.getItem(`notif_prefs_${user?.id}`);
    if (stored) {
      try {
        setPrefs({ ...defaultPrefs, ...JSON.parse(stored) });
      } catch {}
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    localStorage.setItem(`notif_prefs_${user?.id}`, JSON.stringify(prefs));
    
    // Update the trigger timing by deleting future unread notifications and recreating
    // For now we just save preferences locally and use them in the notification bell filter
    toast({ title: 'Preferences saved successfully' });
    setSaving(false);
  };

  const notificationTypes = [
    {
      key: 'task_reminders' as const,
      label: 'Task Reminders',
      description: 'Get notified before scheduled tasks',
      icon: Calendar,
      iconColor: 'text-blue-500 bg-blue-500/10',
    },
    {
      key: 'followup_reminders' as const,
      label: 'Follow-up Reminders',
      description: 'Reminders for upcoming lead follow-ups',
      icon: Clock,
      iconColor: 'text-amber-500 bg-amber-500/10',
    },
    {
      key: 'site_visit_reminders' as const,
      label: 'Site Visit Reminders',
      description: 'Alerts before scheduled site visits',
      icon: MapPin,
      iconColor: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      key: 'new_lead_alerts' as const,
      label: 'New Lead Alerts',
      description: 'Get notified when new leads are added',
      icon: AlertCircle,
      iconColor: 'text-primary bg-primary/10',
    },
    {
      key: 'lead_assignment_alerts' as const,
      label: 'Lead Assignment Alerts',
      description: 'Get notified when a lead is assigned to you',
      icon: UserPlus,
      iconColor: 'text-purple-500 bg-purple-500/10',
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notification Preferences
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure how and when you receive notifications
        </p>
      </div>

      {/* Reminder Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder Timing</CardTitle>
          <CardDescription>
            How early should you be reminded before scheduled events?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={prefs.reminder_timing}
            onValueChange={(v) => setPrefs(p => ({ ...p, reminder_timing: v }))}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes before</SelectItem>
              <SelectItem value="30">30 minutes before</SelectItem>
              <SelectItem value="60">1 hour before</SelectItem>
              <SelectItem value="120">2 hours before</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Types</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {notificationTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <div key={type.key}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${type.iconColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium cursor-pointer">{type.label}</Label>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs[type.key]}
                    onCheckedChange={(checked) => setPrefs(p => ({ ...p, [type.key]: checked }))}
                  />
                </div>
                {index < notificationTypes.length - 1 && <Separator />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button onClick={savePreferences} disabled={saving} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );
}
