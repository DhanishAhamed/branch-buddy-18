import { useAuth } from '@/contexts/AuthContext';
import { ScheduleWidget } from '@/components/dashboard/ScheduleWidget';
import { KPICards } from '@/components/dashboard/KPICards';

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-muted-foreground">Here's what's happening today.</p>
      </div>

      <ScheduleWidget />
      <KPICards />
    </div>
  );
}
