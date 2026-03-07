import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ScheduleWidget } from '@/components/dashboard/ScheduleWidget';
import { SwipeableKPICards } from '@/components/dashboard/SwipeableKPICards';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { RecentLeads } from '@/components/dashboard/RecentLeads';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { LeadSourcesPanel } from '@/components/dashboard/LeadSourcesPanel';
import { SiteVisitReminder } from '@/components/dashboard/SiteVisitReminder';
import { AgentLeaderboard } from '@/components/dashboard/AgentLeaderboard';
import { PropertyHotlist } from '@/components/dashboard/PropertyHotlist';
import { TeamPerformanceCard } from '@/components/dashboard/TeamPerformanceCard';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const isMobile = useIsMobile();
  const [newInquiries, setNewInquiries] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchNewInquiries = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', user?.id)
      .eq('status', 'new');
    
    setNewInquiries(count || 0);
  }, [user]);

  useEffect(() => {
    fetchNewInquiries();
  }, [fetchNewInquiries, refreshKey]);

  const handleLeadAdded = () => {
    setRefreshKey(prev => prev + 1);
    fetchNewInquiries();
  };

  return (
    <div className="p-5 md:px-6 space-y-3.5">
      {/* Mobile Workspace Switcher */}
      {isMobile && (
        <div className="flex items-center justify-between">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Dashboard Header */}
      <DashboardHeader onLeadAdded={handleLeadAdded} />

      {/* ROW 1 — Stat Cards */}
      <div className="dashboard-row" style={{ animationDelay: '0s' }}>
        <SwipeableKPICards key={`kpi-${refreshKey}`} />
      </div>

      {/* ROW 2 — Performance Overview + Team Performance */}
      <div className="dashboard-row grid grid-cols-1 lg:grid-cols-2 gap-3.5" style={{ animationDelay: '0.08s' }}>
        <div className="flex flex-col">
          <PerformanceChart key={`chart-${refreshKey}`} />
        </div>
        <div className="flex flex-col">
          <TeamPerformanceCard refreshKey={refreshKey} />
        </div>
      </div>

      {/* ROW 3 — Lead Sources + Site Visit/Followup + Schedule */}
      <div
        className="dashboard-row grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
        style={{ animationDelay: '0.16s' }}
      >
        <LeadSourcesPanel />
        <SiteVisitReminder />
        <div className="md:col-span-2 lg:col-span-1">
          <ScheduleWidget />
        </div>
      </div>

      {/* ROW 4 — Recent Leads + Agent Leaderboard + Property Hotlist */}
      <div
        className="dashboard-row grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-3.5"
        style={{ animationDelay: '0.24s' }}
      >
        <RecentLeads key={`leads-${refreshKey}`} />
        <AgentLeaderboard />
        <PropertyHotlist />
      </div>
    </div>
  );
}
