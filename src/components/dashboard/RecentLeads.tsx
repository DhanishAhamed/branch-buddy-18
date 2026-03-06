import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  status: string;
  source: string | null;
  created_at: string;
  property: {
    title: string;
  } | null;
}

export function RecentLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile?.branch_id) {
      fetchRecentLeads();
    }
  }, [user, profile]);

  const fetchRecentLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        status,
        source,
        created_at,
        property:properties(title)
      `)
      .eq('assigned_to', user?.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setLeads(data as Lead[]);
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'new':
        return { color: 'bg-[hsl(var(--green-accent))]', label: 'New' };
      case 'need_followup':
      case 'contacted':
        return { color: 'bg-[hsl(var(--warning))]', label: 'Follow-up' };
      case 'site_visit_scheduled':
        return { color: 'bg-blue-500', label: 'Visit' };
      case 'negotiating':
        return { color: 'bg-[hsl(var(--warning))]', label: 'Negotiating' };
      case 'qualified':
        return { color: 'bg-[hsl(var(--green-light))]', label: 'Qualified' };
      default:
        return { color: 'bg-muted-foreground', label: status };
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-foreground">Recent Leads</h3>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">Latest inquiries and contacts</p>
        </div>
        <Link to="/leads" className="text-[12.5px] font-semibold text-[hsl(var(--green-accent))] hover:text-[hsl(var(--green-dark))] transition-colors">
          View All →
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-[13px]">
          No recent leads
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] pb-2 border-b border-border">Name</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] pb-2 border-b border-border">Type</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] pb-2 border-b border-border">Status</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] pb-2 border-b border-border">Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const statusInfo = getStatusDot(lead.status);
                return (
                  <tr key={lead.id} className="hover:bg-muted/50 transition-colors cursor-pointer border-b border-muted/30 last:border-0">
                    <td className="py-2.5 text-[13px]">
                      <span className="font-semibold text-foreground">{lead.name}</span>
                    </td>
                    <td className="py-2.5 text-[11px] text-muted-foreground">
                      {lead.source || 'Direct'}
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium">
                        <span className={`w-[7px] h-[7px] rounded-full ${statusInfo.color}`} />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-2.5 text-[11px] text-muted-foreground">
                      {format(new Date(lead.created_at), 'MMM d')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
