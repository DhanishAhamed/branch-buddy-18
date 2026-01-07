import { useAuth } from '@/contexts/AuthContext';
import { ScheduleWidget } from '@/components/dashboard/ScheduleWidget';
import { KPICards } from '@/components/dashboard/KPICards';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, TrendingUp, Building2 } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'User';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-6 md:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary-foreground/80 mb-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">{greeting}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-primary-foreground/80 max-w-xl">
            Here's what's happening with your properties and leads today. Let's make it a productive day!
          </p>
        </div>
        <div className="absolute -bottom-8 -right-8 opacity-10">
          <Building2 className="h-40 w-40" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Your Performance Today</span>
      </div>
      
      <KPICards />

      {/* Schedule Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          📅 Today's Schedule
        </h2>
        <ScheduleWidget />
      </div>
    </div>
  );
}