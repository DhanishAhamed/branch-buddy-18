import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

interface UpcomingVisit {
  name: string;
  time: string;
}

export function SiteVisitReminder() {
  const [nextVisit, setNextVisit] = useState<UpcomingVisit | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchNextVisit();
      fetchPendingFollowups();
    }
  }, [user]);

  const fetchNextVisit = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('leads')
      .select('name, site_visit_time')
      .not('site_visit_time', 'is', null)
      .gte('site_visit_time', now)
      .order('site_visit_time', { ascending: true })
      .limit(1);

    if (data && data.length > 0) {
      setNextVisit({
        name: data[0].name,
        time: format(new Date(data[0].site_visit_time!), 'h:mm a, MMM d'),
      });
    }
  };

  const fetchPendingFollowups = async () => {
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('is_completed', false)
      .lt('scheduled_at', new Date().toISOString());

    setPendingCount(count || 0);
  };

  return (
    <div className="dashboard-card h-full flex flex-col gap-2 !p-3">
      {/* Site Visit Block */}
      <div className="rounded-[10px] p-3.5 text-white" style={{ background: '#1a4731' }}>
        <h4 style={{ fontSize: 13, fontWeight: 700 }} className="mb-1">🏠 Upcoming Site Visit</h4>
        {nextVisit ? (
          <p style={{ fontSize: 11, opacity: 0.75 }} className="mb-3">
            {nextVisit.name} at {nextVisit.time}
          </p>
        ) : (
          <p style={{ fontSize: 11, opacity: 0.75 }} className="mb-3">No visits scheduled</p>
        )}
        <button
          onClick={() => navigate('/pipeline')}
          className="w-full flex items-center justify-center gap-1.5 border-0 text-white py-2 text-[12px] font-semibold hover:bg-white/30 transition-colors"
          style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 7 }}
        >
          <Calendar className="h-3.5 w-3.5" />
          Schedule Site Visit
        </button>
      </div>

      {/* Pending Followup Strip */}
      <div className="rounded-[10px] p-3 flex items-center gap-3" style={{ background: '#fee2e2' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>
          {String(pendingCount).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>Pending Follow-ups</p>
          <p style={{ fontSize: 10, color: '#ef9a9a' }}>Overdue by 2+ days</p>
        </div>
        <Link to="/calendar" style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>View →</Link>
      </div>
    </div>
  );
}
