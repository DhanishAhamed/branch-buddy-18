import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { SemicircleGauge } from './SemicircleGauge';
import { ChevronDown, AlertTriangle } from 'lucide-react';

interface CircleData {
  percentage: number;
  numerator: number;
  denominator: number;
}

function PerformancePill({ percentage, type }: { percentage: number; type: 'ops' | 'sales' }) {
  let label: string;
  let bg: string;
  let text: string;

  if (type === 'ops') {
    if (percentage >= 60) { label = '💪 Strong'; bg = '#d8f3dc'; text = '#1a4731'; }
    else if (percentage >= 30) { label = '⚡ Moderate'; bg = '#fef3c7'; text = '#92400e'; }
    else { label = '⚠️ Needs Attention'; bg = '#fee2e2'; text = '#dc2626'; }
  } else {
    if (percentage >= 50) { label = '🚀 Excellent'; bg = '#d8f3dc'; text = '#1a4731'; }
    else if (percentage >= 25) { label = '⚡ Average'; bg = '#fef3c7'; text = '#92400e'; }
    else { label = '⚠️ Low'; bg = '#fee2e2'; text = '#dc2626'; }
  }

  return (
    <span
      className="inline-block rounded-full px-3 py-0.5"
      style={{ backgroundColor: bg, color: text, fontSize: 12, fontWeight: 600 }}
    >
      {label}
    </span>
  );
}

export function TeamPerformanceCard({ refreshKey }: { refreshKey?: number }) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [ops, setOps] = useState<CircleData>({ percentage: 0, numerator: 0, denominator: 0 });
  const [sales, setSales] = useState<CircleData>({ percentage: 0, numerator: 0, denominator: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: leads } = await supabase
          .from('leads')
          .select('status');

        if (leads && leads.length > 0) {
          const total = leads.length;
          const qualified = leads.filter(l => l.status === 'qualified').length;
          const opsPerc = total > 0 ? Math.round((qualified / total) * 100) : 0;
          setOps({ percentage: opsPerc, numerator: qualified, denominator: total });

          const siteVisit = leads.filter(l => l.status === 'site_visit_scheduled').length;
          const won = leads.filter(l => l.status === 'closed_won').length;
          const salesDenom = siteVisit + won;
          const salesPerc = salesDenom > 0 ? Math.round((won / salesDenom) * 100) : 0;
          setSales({ percentage: salesPerc, numerator: won, denominator: salesDenom });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, activeWorkspace?.id, refreshKey]);

  const gaugeWidth = isMobile ? 130 : 150;
  const lowerMetric = ops.percentage <= sales.percentage ? 'ops' : 'sales';
  const insightText = lowerMetric === 'ops'
    ? 'Lead qualification rate needs attention — consider refining intake criteria.'
    : 'Site visit conversion is lagging — review follow-up timing after visits.';

  return (
    <div className="dashboard-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700 }} className="text-foreground">
            Team Performance
          </h3>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Operational & Sales overview
          </p>
        </div>
        <button className="flex items-center gap-1 bg-[#f1f4f6] rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-border transition-colors">
          This Month
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Gauges */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-stretch flex-1`}>
        {/* Operational Team */}
        <div className="flex-1 flex flex-col items-center py-2" style={{ padding: isMobile ? '8px 0 16px 0' : '0 24px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 12 }}>
            🏢 OPERATIONAL TEAM
          </span>
          {loading ? (
            <Skeleton className="rounded-lg" style={{ width: gaugeWidth, height: 80 }} />
          ) : (
            <SemicircleGauge percentage={ops.percentage} color="#40916c" label="of pipeline" svgWidth={gaugeWidth} />
          )}
          <span style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }} className="text-foreground">
            Qualified Leads
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {loading ? '—' : `${ops.numerator} of ${ops.denominator} leads`}
          </span>
          {!loading && ops.denominator > 0 && (
            <>
              <div style={{ marginTop: 6 }}>
                <PerformancePill percentage={ops.percentage} type="ops" />
              </div>
              <span style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>vs pipeline total</span>
            </>
          )}
          {!loading && ops.denominator === 0 && (
            <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>No data yet</span>
          )}
        </div>

        {/* Divider */}
        {isMobile ? (
          <div style={{ borderTop: '1px solid #e2e8ed', margin: '4px 0' }} />
        ) : (
          <div style={{ borderLeft: '1px solid #e2e8ed' }} />
        )}

        {/* Sales Team */}
        <div className="flex-1 flex flex-col items-center py-2" style={{ padding: isMobile ? '16px 0 8px 0' : '0 24px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 12 }}>
            💼 SALES TEAM
          </span>
          {loading ? (
            <Skeleton className="rounded-lg" style={{ width: gaugeWidth, height: 80 }} />
          ) : (
            <SemicircleGauge percentage={sales.percentage} color="#1a4731" label="converted" svgWidth={gaugeWidth} />
          )}
          <span style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }} className="text-foreground">
            Visits Converted
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {loading ? '—' : `${sales.numerator} of ${sales.denominator} visits`}
          </span>
          {!loading && sales.denominator > 0 && (
            <>
              <div style={{ marginTop: 6 }}>
                <PerformancePill percentage={sales.percentage} type="sales" />
              </div>
              <span style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>from scheduled visits</span>
            </>
          )}
          {!loading && sales.denominator === 0 && (
            <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>No data yet</span>
          )}
        </div>
      </div>

      {/* Insight strip */}
      {!loading && (ops.denominator > 0 || sales.denominator > 0) && (
        <div className="flex items-center justify-between gap-3" style={{ borderTop: '1px solid #f1f4f6', paddingTop: 10, marginTop: 12 }}>
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }} className="line-clamp-2">
              {insightText}
            </p>
          </div>
          <button className="text-[11px] font-semibold whitespace-nowrap" style={{ color: '#40916c' }}>
            View Full Report →
          </button>
        </div>
      )}
    </div>
  );
}
