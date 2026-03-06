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
    <div className="p-4 md:p-6 lg:p-7 space-y-5">
      {/* Mobile Workspace Switcher */}
      {isMobile && (
        <div className="flex items-center justify-between">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Dashboard Header */}
      <DashboardHeader onLeadAdded={handleLeadAdded} />

      {/* KPI Cards - 4 cols */}
      <SwipeableKPICards key={`kpi-${refreshKey}`} />

      {/* Middle Row: Chart + Reminder/Sources + Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_340px_260px] gap-4">
        {/* Performance Chart */}
        <div className="md:col-span-2 lg:col-span-1">
          <PerformanceChart key={`chart-${refreshKey}`} />
        </div>
        
        {/* Reminder + Lead Sources */}
        <div className="flex flex-col gap-4">
          <SiteVisitReminder />
          <LeadSourcesPanel />
        </div>

        {/* Schedule */}
        <div className="md:col-span-2 lg:col-span-1">
          <ScheduleWidget />
        </div>
      </div>

      {/* Bottom Row: Recent Leads + Agent Leaderboard + Property Hotlist */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_340px_1fr] gap-4">
        <RecentLeads key={`leads-${refreshKey}`} />
        <AgentLeaderboard />
        <PropertyHotlist />
      </div>
    </div>
  );
}
