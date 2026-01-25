import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    
    // Get leads created per day for the last 7 days
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

  // Ensure we have data, use placeholder if not
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
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">Performance Overview</CardTitle>
          <p className="text-sm text-muted-foreground">Weekly lead conversion and inquiries</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
          {period}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} barCategoryGap="20%">
              <XAxis 
                dataKey="dayShort" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis hide />
              <Bar 
                dataKey="value" 
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              >
                {displayData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.dayShort === today ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
