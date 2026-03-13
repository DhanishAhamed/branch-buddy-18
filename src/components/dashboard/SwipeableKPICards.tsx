import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
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
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { isMobile } = useDevice();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && activeWorkspace?.id) {
      fetchKPIs();
    }
  }, [user, activeWorkspace?.id]);

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
      subtitle: `${kpis.completedVisits} done, ${kpis.remainingVisits} left`,
      route: '/calendar',
    },
    {
      title: 'Pending Follow-ups',
      value: kpis.pendingFollowups.toString().padStart(2, '0'),
      isDark: false,
      pill: kpis.pendingFollowups > 0 ? 'Overdue 2+ days' : 'All Clear',
      pillType: kpis.pendingFollowups > 0 ? 'red' as const : 'green' as const,
      subtitle: kpis.pendingFollowups > 0 ? 'Needs attention' : 'All caught up',
      route: '/calendar',
    },
    {
      title: 'Pipeline Value',
      value: `₹${kpis.pipelineValue.toLocaleString('en-IN')}`,
      isDark: false,
      pill: 'On Discuss',
      pillType: 'amber' as const,
      subtitle: `${kpis.activeDeals} deals`,
      route: '/pipeline',
    },
  ];

  const pillStyles: Record<string, { bg: string; color: string }> = {
    white: { bg: 'rgba(255,255,255,0.2)', color: '#fff' },
    green: { bg: '#d8f3dc', color: '#1a4731' },
    red: { bg: '#fee2e2', color: '#dc2626' },
    amber: { bg: '#fef3c7', color: '#92400e' },
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
      className="relative cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{
        padding: 16,
        borderRadius: 14,
        border: card.isDark ? 'none' : '1px solid #e2e8ed',
        background: card.isDark ? '#1a4731' : '#fff',
        color: card.isDark ? '#fff' : undefined,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Arrow icon */}
      <div
        className="absolute top-3.5 right-3.5 flex items-center justify-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: card.isDark ? 'rgba(255,255,255,0.15)' : '#f1f4f6',
        }}
      >
        <ArrowUpRight style={{ width: 13, height: 13, color: card.isDark ? '#fff' : '#94a3b8' }} />
      </div>

      <p style={{ fontSize: 12, fontWeight: 500, opacity: card.isDark ? 0.65 : 1, color: card.isDark ? '#fff' : '#94a3b8', marginBottom: 8 }}>
        {card.title}
      </p>
      <p style={{ fontSize: card.title === 'Pipeline Value' ? 28 : 32, fontWeight: 800, lineHeight: 1, marginBottom: 8 }} className={card.isDark ? '' : 'text-foreground'}>
        {card.value}
      </p>
      <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: card.isDark ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            background: pillStyles[card.pillType].bg,
            color: pillStyles[card.pillType].color,
          }}
        >
          {card.pillType === 'white' && leadPercentChange >= 0 && <TrendingUp style={{ width: 12, height: 12 }} />}
          {card.pill}
        </span>
        {card.subtitle}
      </div>
    </div>
  );

  const renderMobileCard = (card: typeof cards[0], index: number) => (
    <div
      key={card.title}
      onClick={() => navigate(card.route)}
      className="relative cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{
        padding: 12,
        borderRadius: 14,
        border: card.isDark ? 'none' : '1px solid #e2e8ed',
        background: card.isDark ? '#1a4731' : '#fff',
        color: card.isDark ? '#fff' : undefined,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 500, opacity: card.isDark ? 0.65 : 1, color: card.isDark ? '#fff' : '#94a3b8', marginBottom: 6 }}>
        {card.title}
      </p>
      <p style={{ fontSize: card.title === 'Pipeline Value' ? 22 : 26, fontWeight: 800, lineHeight: 1, marginBottom: 6 }} className={card.isDark ? '' : 'text-foreground'}>
        {card.value}
      </p>
      <div className="flex items-center gap-1" style={{ fontSize: 10, color: card.isDark ? 'rgba(255,255,255,0.6)' : '#94a3b8', flexWrap: 'wrap' }}>
        <span
          className="inline-flex items-center gap-0.5 rounded-full"
          style={{
            fontSize: 9,
            fontWeight: 600,
            padding: '2px 6px',
            background: pillStyles[card.pillType].bg,
            color: pillStyles[card.pillType].color,
          }}
        >
          {card.pillType === 'white' && leadPercentChange >= 0 && <TrendingUp style={{ width: 10, height: 10 }} />}
          {card.pill}
        </span>
        <span style={{ fontSize: 10 }}>{card.subtitle}</span>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((card, index) => renderMobileCard(card, index))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((card, index) => renderCard(card, index))}
    </div>
  );
}
