import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';

interface CircleData {
  percentage: number;
  numerator: number;
  denominator: number;
}

function CircularProgress({
  percentage,
  color,
  size,
  label,
}: {
  percentage: number;
  color: string;
  size: number;
  label: string;
}) {
  const [offset, setOffset] = useState(339.3);
  const r = 54 * (size / 140);
  const circumference = 2 * Math.PI * r;
  const center = size / 2;
  const strokeWidth = 10 * (size / 140);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference * (1 - percentage / 100));
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage, circumference]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={r}
          stroke="#e2e8ed"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1s ease',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontSize: size > 120 ? 24 : 20, fontWeight: 800, color: '#1e293b' }}>
          {percentage}%
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
      </div>
    </div>
  );
}

function PerformancePill({ percentage, type }: { percentage: number; type: 'ops' | 'sales' }) {
  let label: string;
  let bg: string;
  let text: string;

  if (type === 'ops') {
    if (percentage >= 60) { label = 'Strong'; bg = '#d8f3dc'; text = '#1a4731'; }
    else if (percentage >= 30) { label = 'Moderate'; bg = '#fef3c7'; text = '#92400e'; }
    else { label = 'Needs Attention'; bg = '#fee2e2'; text = '#dc2626'; }
  } else {
    if (percentage >= 50) { label = 'Excellent'; bg = '#d8f3dc'; text = '#1a4731'; }
    else if (percentage >= 25) { label = 'Average'; bg = '#fef3c7'; text = '#92400e'; }
    else { label = 'Low'; bg = '#fee2e2'; text = '#dc2626'; }
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

  const circleSize = isMobile ? 110 : 140;

  return (
    <div
      className="w-full border border-border bg-card"
      style={{ borderRadius: 16, padding: 24 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }} className="text-foreground">
            Team Performance Overview
          </h3>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Identify where performance needs improvement
          </p>
        </div>
        <select
          className="text-xs border border-border rounded-lg px-3 py-1.5 bg-card text-muted-foreground"
          defaultValue="this_month"
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_quarter">This Quarter</option>
        </select>
      </div>

      {/* Circles */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-stretch`}>
        {/* Operational Team */}
        <div className="flex-1 flex flex-col items-center" style={{ padding: isMobile ? '0 0 24px 0' : '0 32px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 16 }}>
            OPERATIONAL TEAM
          </span>
          {loading ? (
            <Skeleton className="rounded-full" style={{ width: circleSize, height: circleSize }} />
          ) : (
            <CircularProgress percentage={ops.percentage} color="#40916c" size={circleSize} label="of pipeline" />
          )}
          <span style={{ fontSize: 14, fontWeight: 700, marginTop: 12 }} className="text-foreground">
            Qualified Leads
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            {loading ? '—' : `${ops.numerator} of ${ops.denominator} leads`}
          </span>
          {!loading && ops.denominator > 0 && (
            <>
              <div style={{ marginTop: 8 }}>
                <PerformancePill percentage={ops.percentage} type="ops" />
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>vs pipeline total</span>
            </>
          )}
          {!loading && ops.denominator === 0 && (
            <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>No data yet</span>
          )}
        </div>

        {/* Divider */}
        {isMobile ? (
          <div className="border-t border-border my-2" />
        ) : (
          <div className="border-l border-border" />
        )}

        {/* Sales Team */}
        <div className="flex-1 flex flex-col items-center" style={{ padding: isMobile ? '24px 0 0 0' : '0 32px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 16 }}>
            SALES TEAM
          </span>
          {loading ? (
            <Skeleton className="rounded-full" style={{ width: circleSize, height: circleSize }} />
          ) : (
            <CircularProgress percentage={sales.percentage} color="#1a4731" size={circleSize} label="converted" />
          )}
          <span style={{ fontSize: 14, fontWeight: 700, marginTop: 12 }} className="text-foreground">
            Visits Converted
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            {loading ? '—' : `${sales.numerator} of ${sales.denominator} visits`}
          </span>
          {!loading && sales.denominator > 0 && (
            <>
              <div style={{ marginTop: 8 }}>
                <PerformancePill percentage={sales.percentage} type="sales" />
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>from scheduled visits</span>
            </>
          )}
          {!loading && sales.denominator === 0 && (
            <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>No data yet</span>
          )}
        </div>
      </div>
    </div>
  );
}
