import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, CalendarCheck, Clock } from 'lucide-react';

interface KPIData {
  activeLeads: number;
  siteVisitsToday: number;
  pendingFollowups: number;
}

export function KPICards() {
  const [kpis, setKpis] = useState<KPIData>({
    activeLeads: 0,
    siteVisitsToday: 0,
    pendingFollowups: 0,
  });
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile?.branch_id) {
      fetchKPIs();
    }
  }, [user, profile]);

  const fetchKPIs = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get active leads count
    const { count: activeLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', user?.id)
      .not('status', 'in', '("closed_won","closed_lost")');

    // Get site visits scheduled today
    const { count: siteVisitsToday } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())
      .ilike('title', '%site visit%');

    // Get pending follow-ups (overdue tasks)
    const { count: pendingFollowups } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('is_completed', false)
      .lt('scheduled_at', new Date().toISOString());

    setKpis({
      activeLeads: activeLeads || 0,
      siteVisitsToday: siteVisitsToday || 0,
      pendingFollowups: pendingFollowups || 0,
    });
  };

  const cards = [
    {
      title: 'My Active Leads',
      value: kpis.activeLeads,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Site Visits Today',
      value: kpis.siteVisitsToday,
      icon: CalendarCheck,
      color: 'text-accent-foreground',
      bgColor: 'bg-accent',
    },
    {
      title: 'Pending Follow-ups',
      value: kpis.pendingFollowups,
      icon: Clock,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`${card.bgColor} p-3 rounded-xl`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
