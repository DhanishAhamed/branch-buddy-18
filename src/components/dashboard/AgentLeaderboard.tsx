import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AgentData {
  id: string;
  name: string;
  initials: string;
  deals: number;
}

export function AgentLeaderboard() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.branch_id) fetchAgents();
  }, [profile]);

  const fetchAgents = async () => {
    // Get all profiles in same branch
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('branch_id', profile?.branch_id);

    if (!profiles) return;

    // Get closed won count per user this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const agentData: AgentData[] = [];

    for (const p of profiles) {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', p.user_id)
        .eq('status', 'closed_won')
        .gte('updated_at', monthStart.toISOString());

      const name = p.full_name || 'Unknown';
      agentData.push({
        id: p.user_id,
        name,
        initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        deals: count || 0,
      });
    }

    agentData.sort((a, b) => b.deals - a.deals);
    setAgents(agentData.slice(0, 5));
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-foreground">Agent Leaderboard</h3>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">Top performers this month</p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[hsl(var(--green-pale))] text-[hsl(var(--green-dark))]">
          This Month
        </span>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-[12px]">
          No agents data yet.{' '}
          <button onClick={() => navigate('/admin/users')} className="text-[hsl(var(--green-accent))] font-semibold hover:underline">
            Add team members →
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          {agents.map((agent, index) => (
            <div key={agent.id} className="flex items-center gap-2.5 py-2 border-b border-muted/30 last:border-0">
              <span className={`w-5 text-[11px] font-bold text-center shrink-0 ${index === 0 ? 'text-[hsl(var(--green-accent))]' : 'text-muted-foreground'}`}>
                {index + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--green-dark))] to-[hsl(var(--green-accent))] flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                {agent.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{agent.name}</p>
                <p className="text-[11px] text-muted-foreground">Agent</p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-extrabold text-[hsl(var(--green-dark))]">{agent.deals}</p>
                <p className="text-[10px] text-muted-foreground">deals</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
