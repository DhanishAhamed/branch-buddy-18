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
    <div className="p-3 md:p-5 lg:p-7 space-y-4 md:space-y-5">
      {/* Mobile Workspace Switcher */}
      {isMobile && (
        <div className="flex items-center justify-between">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Dashboard Header */}
      <DashboardHeader onLeadAdded={handleLeadAdded} />

      {/* KPI Cards - responsive grid */}
      <SwipeableKPICards key={`kpi-${refreshKey}`} />

      {/* Team Performance Overview */}
      <TeamPerformanceCard refreshKey={refreshKey} />

      {/* Middle Row: responsive stacking */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px_260px] gap-4">
        {/* Performance Chart - full width on mobile/tablet */}
        <div className="col-span-1 lg:col-span-1">
          <PerformanceChart key={`chart-${refreshKey}`} />
        </div>
        
        {/* Reminder + Lead Sources - side by side on tablet, stacked on mobile */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
          <div className="flex-1">
            <SiteVisitReminder />
          </div>
          <div className="flex-1">
            <LeadSourcesPanel />
          </div>
        </div>

        {/* Schedule */}
        <div className="col-span-1">
          <ScheduleWidget />
        </div>
      </div>

      {/* Bottom Row: responsive stacking */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px_1fr] gap-4">
        <div className="col-span-1 lg:col-span-1 order-1">
          <RecentLeads key={`leads-${refreshKey}`} />
        </div>
        <div className="col-span-1 sm:col-span-1 order-3 lg:order-2">
          <AgentLeaderboard />
        </div>
        <div className="col-span-1 sm:col-span-1 order-2 lg:order-3">
          <PropertyHotlist />
        </div>
      </div>
    </div>
  );
}
