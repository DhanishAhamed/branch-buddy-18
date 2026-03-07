import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface SourceData {
  name: string;
  count: number;
  percentage: number;
  dotColor: string;
}

const SOURCE_DOT_COLORS: Record<string, string> = {
  'Website': '#1a4731',
  'WhatsApp': '#40916c',
  'Referral': '#74c69d',
  'Walk-in': '#f59e0b',
};

export function LeadSourcesPanel() {
  const [sources, setSources] = useState<SourceData[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchSources();
  }, [user]);

  const fetchSources = async () => {
    const { data } = await supabase
      .from('leads')
      .select('source')
      .eq('assigned_to', user?.id);

    if (!data) return;

    const total = data.length;
    const counts: Record<string, number> = {};
    
    data.forEach(lead => {
      const src = lead.source || 'Direct';
      counts[src] = (counts[src] || 0) + 1;
    });

    const sourceNames = ['Website', 'WhatsApp', 'Referral', 'Walk-in'];
    const result = sourceNames.map(name => ({
      name,
      count: counts[name] || 0,
      percentage: total > 0 ? Math.round(((counts[name] || 0) / total) * 100) : 0,
      dotColor: SOURCE_DOT_COLORS[name] || '#94a3b8',
    }));

    setSources(result);
  };

  return (
    <div className="dashboard-card h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700 }} className="text-foreground">Lead Sources</h3>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Where your leads come from</p>
        </div>
        <Link to="/leads" className="text-[11px] font-semibold" style={{ color: '#40916c' }}>
          Details →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sources.map((source) => (
          <div key={source.name} className="rounded-[9px] p-2.5 flex flex-col gap-1" style={{ background: '#f8fafb' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: source.dotColor }} />
            <span style={{ fontSize: 10.5, color: '#94a3b8' }}>{source.name}</span>
            <span style={{ fontSize: 20, fontWeight: 800 }} className="text-foreground">{source.count}</span>
            <span style={{ fontSize: 10, color: '#40916c', fontWeight: 600 }}>{source.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
