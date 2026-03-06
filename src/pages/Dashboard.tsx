import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ScheduleWidget } from '@/components/dashboard/ScheduleWidget';
import { SwipeableKPICards } from '@/components/dashboard/SwipeableKPICards';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { RecentLeads } from '@/components/dashboard/RecentLeads';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sparkles, Building2, ArrowLeftRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const isMobile = useIsMobile();
  const [newInquiries, setNewInquiries] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const firstName = profile?.full_name?.split(' ')[0] || 'User';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

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
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Mobile Workspace Switcher */}
      {isMobile && (
        <div className="flex items-center justify-between">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Dashboard Header with New Lead Button */}
      <DashboardHeader onLeadAdded={handleLeadAdded} />


      {/* KPI Cards */}
      <SwipeableKPICards key={`kpi-${refreshKey}`} />

      {/* Main Content Grid - 2 columns on tablet, 3 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Chart - full width on mobile, spans 2 on tablet, 2 on desktop */}
        <div className="md:col-span-2 lg:col-span-2">
          <PerformanceChart key={`chart-${refreshKey}`} />
        </div>
        
        {/* Schedule - full width on mobile/tablet row 2, right column on desktop */}
        <div className="md:col-span-1 lg:col-span-1 lg:row-span-2">
          <ScheduleWidget />
        </div>
        
        {/* Recent Leads - full width on mobile, spans 2 on tablet/desktop */}
        <div className="md:col-span-2 lg:col-span-2">
          <RecentLeads key={`leads-${refreshKey}`} />
        </div>
      </div>
    </div>
  );
}