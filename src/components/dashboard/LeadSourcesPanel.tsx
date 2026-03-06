import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SourceData {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

const SOURCE_COLORS: Record<string, string> = {
  'Website': 'bg-[hsl(var(--green-dark))]',
  'WhatsApp': 'bg-[hsl(var(--green-accent))]',
  'Referral': 'bg-[hsl(var(--green-light))]',
  'Walk-in': 'bg-[hsl(var(--warning))]',
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
      color: SOURCE_COLORS[name] || 'bg-muted',
    }));

    setSources(result);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-[15px] font-bold text-foreground mb-3">Lead Sources</h3>
      <div className="grid grid-cols-2 gap-2">
        {sources.map((source) => (
          <div key={source.name} className="bg-muted/50 rounded-[10px] p-2.5 flex flex-col gap-1">
            <div className={`w-2 h-2 rounded-full ${source.color}`} />
            <span className="text-[11px] text-muted-foreground">{source.name}</span>
            <span className="text-[18px] font-extrabold text-foreground">{source.count}</span>
            <span className="text-[11px] font-semibold text-[hsl(var(--green-accent))]">{source.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
