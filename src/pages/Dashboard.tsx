import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ScheduleWidget } from '@/components/dashboard/ScheduleWidget';
import { KPICards } from '@/components/dashboard/KPICards';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { RecentLeads } from '@/components/dashboard/RecentLeads';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sparkles, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { profile, user } = useAuth();
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
    <div className="p-4 md:p-6 space-y-6">
      {/* Dashboard Header with New Lead Button */}
      <DashboardHeader onLeadAdded={handleLeadAdded} />

      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 md:p-8 text-primary-foreground">
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
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-primary-foreground/85 max-w-xl">
            Here's what's happening with your properties and leads today. You have{' '}
            <Link to="/leads" className="underline font-semibold hover:text-primary-foreground">
              {newInquiries} new {newInquiries === 1 ? 'inquiry' : 'inquiries'}
            </Link>{' '}
            waiting for your attention. Let's make it a productive day!
          </p>
        </div>
        <div className="absolute -bottom-8 -right-8 opacity-10">
          <Building2 className="h-40 w-40" />
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards key={`kpi-${refreshKey}`} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart & Recent Leads */}
        <div className="lg:col-span-2 space-y-6">
          <PerformanceChart key={`chart-${refreshKey}`} />
          <RecentLeads key={`leads-${refreshKey}`} />
        </div>
        
        {/* Right Column - Schedule */}
        <div className="lg:col-span-1">
          <ScheduleWidget />
        </div>
      </div>
    </div>
  );
}