import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface ChartData {
  day: string;
  dayShort: string;
  value: number;
}

export function PerformanceChart() {
  const [period, setPeriod] = useState('Last 7 Days');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const { user } = useAuth();
  const today = format(new Date(), 'EEE');

  useEffect(() => {
    if (user) {
      fetchLeadData();
    }
  }, [user]);

  const fetchLeadData = async () => {
    const days: ChartData[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user?.id)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());
      
      days.push({
        day: format(date, 'EEEE'),
        dayShort: format(date, 'EEE'),
        value: count || 0,
      });
    }
    
    setChartData(days);
  };

  const displayData = chartData.length > 0 ? chartData : [
    { day: 'Monday', dayShort: 'Mon', value: 0 },
    { day: 'Tuesday', dayShort: 'Tue', value: 0 },
    { day: 'Wednesday', dayShort: 'Wed', value: 0 },
    { day: 'Thursday', dayShort: 'Thu', value: 0 },
    { day: 'Friday', dayShort: 'Fri', value: 0 },
    { day: 'Saturday', dayShort: 'Sat', value: 0 },
    { day: 'Sunday', dayShort: 'Sun', value: 0 },
  ];

  return (
    <div className="dashboard-card flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700 }} className="text-foreground">Performance Overview</h3>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Weekly lead conversion & inquiries</p>
        </div>
        <button className="flex items-center gap-1 bg-[#f1f4f6] rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-border transition-colors">
          {period}
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} barCategoryGap="20%">
            <XAxis 
              dataKey="dayShort" 
              axisLine={{ stroke: '#f1f4f6' }}
              tickLine={false}
              tick={{ fontSize: 9.5, fill: '#94a3b8' }}
            />
            <YAxis hide />
            <Bar 
              dataKey="value" 
              radius={[5, 5, 0, 0]}
              maxBarSize={50}
            >
              {displayData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.dayShort === today ? '#1a4731' : '#d8f3dc'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#94a3b8' }}>
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#1a4731' }} />
          Leads
        </div>
        <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#94a3b8' }}>
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#d8f3dc' }} />
          Inquiries
        </div>
      </div>
    </div>
  );
}
