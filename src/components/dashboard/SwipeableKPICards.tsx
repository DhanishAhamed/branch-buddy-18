import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, CalendarCheck, AlertCircle, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface KPIData {
  activeLeads: number;
  siteVisitsToday: number;
  pendingFollowups: number;
  completedVisits: number;
  remainingVisits: number;
  lastMonthLeads: number;
}

export function SwipeableKPICards() {
  const [kpis, setKpis] = useState<KPIData>({
    activeLeads: 0,
    siteVisitsToday: 0,
    pendingFollowups: 0,
    completedVisits: 0,
    remainingVisits: 0,
    lastMonthLeads: 0,
  });
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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

    const { count: activeLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', user?.id)
      .not('status', 'in', '("closed_won","closed_lost")');

    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(0);

    const { count: lastMonthLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', user?.id)
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString());

    const { data: todayVisits } = await supabase
      .from('tasks')
      .select('is_completed')
      .eq('user_id', user?.id)
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())
      .ilike('title', '%site visit%');

    const completedVisits = todayVisits?.filter(t => t.is_completed).length || 0;
    const totalVisits = todayVisits?.length || 0;

    const { count: pendingFollowups } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('is_completed', false)
      .lt('scheduled_at', new Date().toISOString());

    setKpis({
      activeLeads: activeLeads || 0,
      siteVisitsToday: totalVisits,
      pendingFollowups: pendingFollowups || 0,
      completedVisits,
      remainingVisits: totalVisits - completedVisits,
      lastMonthLeads: lastMonthLeads || 0,
    });
  };

  const leadPercentChange = kpis.lastMonthLeads > 0 
    ? Math.round(((kpis.activeLeads - kpis.lastMonthLeads) / kpis.lastMonthLeads) * 100)
    : 0;

  const cards = [
    {
      title: 'ACTIVE LEADS',
      value: kpis.activeLeads,
      icon: UserPlus,
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
      subtitle: `vs ${kpis.lastMonthLeads} last month`,
      badge: leadPercentChange >= 0 ? `+${leadPercentChange}%` : `${leadPercentChange}%`,
      badgeVariant: 'success' as const,
    },
    {
      title: 'SITE VISITS TODAY',
      value: kpis.siteVisitsToday.toString().padStart(2, '0'),
      icon: CalendarCheck,
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
      subtitle: `${kpis.completedVisits} completed, ${kpis.remainingVisits} remaining`,
      badge: 'On Track',
      badgeVariant: 'success' as const,
    },
    {
      title: 'PENDING FOLLOW-UPS',
      value: kpis.pendingFollowups.toString().padStart(2, '0'),
      icon: AlertCircle,
      iconBg: 'bg-destructive/15',
      iconColor: 'text-destructive',
      subtitle: kpis.pendingFollowups > 0 ? 'Overdue by 2+ days' : 'All caught up',
      badge: kpis.pendingFollowups > 0 ? 'Attention Required' : 'All Clear',
      badgeVariant: kpis.pendingFollowups > 0 ? 'destructive' as const : 'success' as const,
    },
  ];

  const scrollToCard = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth',
      });
      setCurrentIndex(index);
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth;
      const newIndex = Math.round(scrollRef.current.scrollLeft / cardWidth);
      setCurrentIndex(newIndex);
    }
  };

  // Mobile: swipeable horizontal scroll
  if (isMobile) {
    return (
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 gap-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {cards.map((card, index) => (
            <Card 
              key={card.title} 
              className="flex-shrink-0 w-[calc(100%-2rem)] snap-center border-border/50 bg-card"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`${card.iconBg} p-2.5 rounded-xl`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <Badge 
                    variant={card.badgeVariant === 'destructive' ? 'destructive' : 'secondary'}
                    className={`text-[10px] font-medium ${
                      card.badgeVariant === 'success' 
                        ? 'bg-primary/15 text-primary hover:bg-primary/20 border-0' 
                        : 'bg-destructive/15 text-destructive hover:bg-destructive/20 border-0'
                    }`}
                  >
                    {card.badgeVariant === 'success' && card.badge.startsWith('+') && (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    )}
                    {card.badge}
                  </Badge>
                </div>
                <p className="text-[11px] font-semibold text-muted-foreground tracking-wide mb-1">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-foreground mb-1">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Pagination dots */}
        <div className="flex justify-center gap-2 mt-4">
          {cards.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToCard(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                currentIndex === index ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Desktop: grid layout
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`${card.iconBg} p-2.5 rounded-xl`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <Badge 
                variant={card.badgeVariant === 'destructive' ? 'destructive' : 'secondary'}
                className={`text-[10px] font-medium ${
                  card.badgeVariant === 'success' 
                    ? 'bg-primary/15 text-primary hover:bg-primary/20 border-0' 
                    : 'bg-destructive/15 text-destructive hover:bg-destructive/20 border-0'
                }`}
              >
                {card.badgeVariant === 'success' && card.badge.startsWith('+') && (
                  <TrendingUp className="h-3 w-3 mr-1" />
                )}
                {card.badge}
              </Badge>
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground tracking-wide mb-1">
              {card.title}
            </p>
            <p className="text-3xl font-bold text-foreground mb-1">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
