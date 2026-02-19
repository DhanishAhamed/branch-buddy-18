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

      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-4 sm:p-6 md:p-8 text-primary-foreground">
        {/* Decorative wave pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
            <path d="M0,100 C200,150 400,50 600,100 C800,150 800,100 800,100 L800,200 L0,200 Z" fill="white" opacity="0.1"/>
            <path d="M0,120 C150,170 350,70 550,120 C750,170 800,120 800,120 L800,200 L0,200 Z" fill="white" opacity="0.1"/>
            <path d="M0,140 C100,190 300,90 500,140 C700,190 800,140 800,140 L800,200 L0,200 Z" fill="white" opacity="0.1"/>
          </svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-primary-foreground/90 mb-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">{greeting}</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-primary-foreground/85 max-w-xl text-sm sm:text-base">
            Here's what's happening with your properties and leads today. You have{' '}
            <Link to="/leads" className="underline font-semibold hover:text-primary-foreground">
              {newInquiries} new {newInquiries === 1 ? 'inquiry' : 'inquiries'}
            </Link>{' '}
            waiting for your attention. Let's make it a productive day!
          </p>
        </div>
        <div className="absolute -bottom-8 -right-8 opacity-10">
          <Building2 className="h-32 w-32 sm:h-40 sm:w-40" />
        </div>
      </div>

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