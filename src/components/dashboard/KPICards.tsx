import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, CalendarCheck, Clock, TrendingUp } from 'lucide-react';

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
      title: 'Active Leads',
      value: kpis.activeLeads,
      icon: Users,
      gradient: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Site Visits Today',
      value: kpis.siteVisitsToday,
      icon: CalendarCheck,
      gradient: 'from-accent to-accent/30',
      iconBg: 'bg-accent',
      iconColor: 'text-accent-foreground',
      trend: 'On Track',
      trendUp: true,
    },
    {
      title: 'Pending Follow-ups',
      value: kpis.pendingFollowups,
      icon: Clock,
      gradient: 'from-destructive/15 to-destructive/5',
      iconBg: 'bg-destructive/15',
      iconColor: 'text-destructive',
      trend: kpis.pendingFollowups > 0 ? 'Action needed' : 'All clear',
      trendUp: kpis.pendingFollowups === 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={`overflow-hidden border-0 bg-gradient-to-br ${card.gradient} shadow-sm hover:shadow-md transition-shadow`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="text-3xl font-bold text-foreground">{card.value}</p>
                <div className="flex items-center gap-1">
                  {card.trendUp ? (
                    <TrendingUp className="h-3 w-3 text-primary" />
                  ) : (
                    <Clock className="h-3 w-3 text-destructive" />
                  )}
                  <span className={`text-xs font-medium ${card.trendUp ? 'text-primary' : 'text-destructive'}`}>
                    {card.trend}
                  </span>
                </div>
              </div>
              <div className={`${card.iconBg} p-3 rounded-xl`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}