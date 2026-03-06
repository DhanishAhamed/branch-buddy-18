import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface UpcomingVisit {
  name: string;
  time: string;
}

export function SiteVisitReminder() {
  const [nextVisit, setNextVisit] = useState<UpcomingVisit | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchNextVisit();
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

  return (
    <div className="bg-[hsl(var(--green-dark))] rounded-xl p-4 text-white">
      <h4 className="text-[15px] font-bold mb-1">🏠 Upcoming Site Visit</h4>
      {nextVisit ? (
        <p className="text-[11.5px] opacity-75 mb-3">
          {nextVisit.name} at {nextVisit.time}
        </p>
      ) : (
        <p className="text-[11.5px] opacity-75 mb-3">No visits scheduled</p>
      )}
      <button
        onClick={() => navigate('/pipeline')}
        className="w-full flex items-center justify-center gap-1.5 bg-white/20 border-0 text-white rounded-lg py-2 text-[12px] font-semibold hover:bg-white/30 transition-colors"
      >
        <Calendar className="h-3.5 w-3.5" />
        Schedule Site Visit
      </button>
    </div>
  );
}
