import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  source: string | null;
  created_at: string;
  property: {
    title: string;
  } | null;
}

export function RecentLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  useEffect(() => {
    if (user && activeWorkspace?.id) {
      fetchRecentLeads();
    }
  }, [user, activeWorkspace?.id]);

  const fetchRecentLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        phone,
        status,
        source,
        created_at,
        property:properties(title)
      `)
      .eq('assigned_to', user?.id)
      .order('created_at', { ascending: false })
      .limit(6);

    if (data) {
      setLeads(data as Lead[]);
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'new':
        return { color: '#40916c', label: 'New' };
      case 'closed_won':
        return { color: '#8b5cf6', label: 'Won' };
      case 'site_visit_scheduled':
        return { color: '#3b82f6', label: 'Site Visit' };
      case 'need_followup':
      case 'contacted':
        return { color: '#f59e0b', label: 'Follow-up' };
      case 'negotiating':
        return { color: '#f59e0b', label: 'Negotiating' };
      case 'qualified':
        return { color: '#74c69d', label: 'Qualified' };
      default:
        return { color: '#94a3b8', label: status };
    }
  };

  const getSourcePill = (source: string | null) => {
    const s = source || 'Direct';
    if (s.toLowerCase().includes('portal') || s.toLowerCase().includes('website'))
      return { bg: '#dbeafe', text: '#1d4ed8' };
    if (s.toLowerCase().includes('referral'))
      return { bg: '#d8f3dc', text: '#1a4731' };
    return { bg: '#f1f4f6', text: '#64748b' };
  };

  return (
    <div className="dashboard-card h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700 }} className="text-foreground">Recent Leads</h3>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Latest inquiries and contacts</p>
        </div>
        <Link to="/leads" className="text-[12px] font-semibold" style={{ color: '#40916c' }}>
          View All →
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-6" style={{ color: '#94a3b8', fontSize: 13 }}>
          No recent leads
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Name', 'Source', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left pb-2 border-b" style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderColor: '#f1f4f6' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const statusInfo = getStatusDot(lead.status);
                const sourcePill = getSourcePill(lead.source);
                return (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors cursor-pointer" style={{ borderBottom: '1px solid #f8fafb' }}>
                    <td style={{ padding: '9px 0', fontSize: 12.5 }}>
                      <span style={{ fontWeight: 600 }} className="text-foreground">{lead.name}</span>
                      {lead.phone && <span className="block" style={{ fontSize: 10.5, color: '#94a3b8' }}>{lead.phone}</span>}
                    </td>
                    <td style={{ padding: '9px 0' }}>
                      <span className="inline-block rounded-full px-2 py-0.5" style={{ fontSize: 10.5, fontWeight: 500, background: sourcePill.bg, color: sourcePill.text }}>
                        {lead.source || 'Direct'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 0' }}>
                      <span className="inline-flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 500 }}>
                        <span className="rounded-full" style={{ width: 6, height: 6, background: statusInfo.color, display: 'inline-block' }} />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '9px 0', fontSize: 10.5, color: '#94a3b8' }}>
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
