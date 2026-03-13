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

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #1a4731, #40916c)',
  'linear-gradient(135deg, #2d6a4f, #74c69d)',
  'linear-gradient(135deg, #374151, #6b7280)',
];

export function AgentLeaderboard() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, [profile]);

  const fetchAgents = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('is_approved', true);

    if (!profiles) return;

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
    <div className="dashboard-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700 }} className="text-foreground">Agent Leaderboard</h3>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Top performers this month</p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full" style={{ fontSize: 10.5, fontWeight: 600, background: '#d8f3dc', color: '#1a4731' }}>
          This Month
        </span>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-4" style={{ color: '#94a3b8', fontSize: 12 }}>
          No agents data yet.{' '}
          <button onClick={() => navigate('/admin/users')} className="font-semibold hover:underline" style={{ color: '#40916c' }}>
            Add team members →
          </button>
        </div>
      ) : (
        <div className="flex-1">
          {agents.map((agent, index) => (
            <div key={agent.id} className="flex items-center gap-2.5" style={{ padding: '7px 0', borderBottom: '1px solid #f8fafb' }}>
              <span className="w-5 text-center shrink-0" style={{ fontSize: 11, fontWeight: 700, color: index === 0 ? '#40916c' : '#94a3b8' }}>
                {index + 1}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: AVATAR_GRADIENTS[index] || AVATAR_GRADIENTS[2], fontSize: 12, fontWeight: 700 }}
              >
                {agent.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 12.5, fontWeight: 700 }} className="text-foreground truncate">{agent.name}</p>
                <p style={{ fontSize: 10, color: '#94a3b8' }}>Agent</p>
              </div>
              <div className="text-right">
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1a4731' }}>{agent.deals}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/admin/users')}
        className="w-full mt-3 text-center"
        style={{ fontSize: 11, fontWeight: 600, color: '#40916c' }}
      >
        View all agents →
      </button>
    </div>
  );
}
