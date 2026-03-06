import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { useDevice } from '@/hooks/use-device';
import { useNavigate } from 'react-router-dom';

interface KPIData {
  activeLeads: number;
  siteVisitsToday: number;
  pendingFollowups: number;
  completedVisits: number;
  remainingVisits: number;
  lastMonthLeads: number;
  pipelineValue: number;
  activeDeals: number;
}

export function SwipeableKPICards() {
  const [kpis, setKpis] = useState<KPIData>({
    activeLeads: 0,
    siteVisitsToday: 0,
    pendingFollowups: 0,
    completedVisits: 0,
    remainingVisits: 0,
    lastMonthLeads: 0,
    pipelineValue: 0,
    activeDeals: 0,
  });
  const { user, profile } = useAuth();
  const { isMobile } = useDevice();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

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

    // Pipeline value - count negotiating leads
    const { count: activeDeals } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', user?.id)
      .eq('status', 'negotiating');

    setKpis({
      activeLeads: activeLeads || 0,
      siteVisitsToday: totalVisits,
      pendingFollowups: pendingFollowups || 0,
      completedVisits,
      remainingVisits: totalVisits - completedVisits,
      lastMonthLeads: lastMonthLeads || 0,
      pipelineValue: 0,
      activeDeals: activeDeals || 0,
    });
  };

  const leadPercentChange = kpis.lastMonthLeads > 0 
    ? Math.round(((kpis.activeLeads - kpis.lastMonthLeads) / kpis.lastMonthLeads) * 100)
    : 0;

  const cards = [
    {
      title: 'Active Leads',
      value: kpis.activeLeads.toString(),
      isDark: true,
      pill: `${leadPercentChange >= 0 ? '+' : ''}${leadPercentChange}%`,
      pillType: 'white' as const,
      subtitle: `vs ${kpis.lastMonthLeads} last month`,
      route: '/leads',
    },
    {
      title: 'Site Visits Today',
      value: kpis.siteVisitsToday.toString().padStart(2, '0'),
      isDark: false,
      pill: 'On Track',
      pillType: 'green' as const,
      subtitle: `${kpis.completedVisits} completed, ${kpis.remainingVisits} remaining`,
      route: '/calendar',
    },
    {
      title: 'Pending Follow-ups',
      value: kpis.pendingFollowups.toString().padStart(2, '0'),
      isDark: false,
      pill: kpis.pendingFollowups > 0 ? 'Attention Required' : 'All Clear',
      pillType: kpis.pendingFollowups > 0 ? 'red' as const : 'green' as const,
      subtitle: kpis.pendingFollowups > 0 ? 'Overdue by 2+ days' : 'All caught up',
      route: '/calendar',
    },
    {
      title: 'Pipeline Value',
      value: `₹${kpis.pipelineValue.toLocaleString('en-IN')}`,
      isDark: false,
      pill: 'On Discuss',
      pillType: 'amber' as const,
      subtitle: `${kpis.activeDeals} active deals`,
      route: '/pipeline',
    },
  ];

  const pillClasses = {
    white: 'bg-white/20 text-white',
    green: 'bg-[hsl(var(--green-pale))] text-[hsl(var(--green-dark))]',
    red: 'bg-destructive/10 text-destructive',
    amber: 'bg-[hsl(43_96%_90%)] text-[hsl(26_60%_30%)]',
  };

  const scrollToCard = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
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

  const renderCard = (card: typeof cards[0], index: number) => (
    <div
      key={card.title}
      onClick={() => navigate(card.route)}
      className={`relative rounded-2xl p-5 border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        card.isDark
          ? 'bg-[hsl(var(--green-dark))] border-[hsl(var(--green-dark))] text-white'
          : 'bg-card border-border text-foreground'
      }`}
    >
      {/* Arrow link */}
      <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center ${
        card.isDark ? 'bg-white/15' : 'bg-muted'
      }`}>
        <ArrowUpRight className={`h-3.5 w-3.5 ${card.isDark ? 'text-white' : 'text-muted-foreground'}`} />
      </div>

      <p className={`text-[12px] font-medium mb-2 ${card.isDark ? 'text-white/65' : 'text-muted-foreground'}`}>
        {card.title}
      </p>
      <p className={`text-[36px] font-extrabold leading-none mb-2 ${card.title === 'Pipeline Value' ? 'text-[28px]' : ''}`}>
        {card.value}
      </p>
      <div className={`flex items-center gap-1.5 text-[11.5px] ${card.isDark ? 'text-white/60' : 'text-muted-foreground'}`}>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${pillClasses[card.pillType]}`}>
          {card.pillType === 'white' && leadPercentChange >= 0 && <TrendingUp className="h-3 w-3" />}
          {card.pill}
        </span>
        {card.subtitle}
      </div>
    </div>
  );

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
            <div key={card.title} className="flex-shrink-0 w-[calc(100%-2rem)] snap-center">
              {renderCard(card, index)}
            </div>
          ))}
        </div>
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => renderCard(card, index))}
    </div>
  );
}
