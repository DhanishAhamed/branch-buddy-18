import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { ChevronDown } from 'lucide-react';

const mockData = [
  { day: 'Mon', value: 45 },
  { day: 'Tue', value: 65 },
  { day: 'Wed', value: 95 },
  { day: 'Thu', value: 55 },
  { day: 'Fri', value: 70 },
  { day: 'Sat', value: 40 },
  { day: 'Sun', value: 50 },
];

export function PerformanceChart() {
  const [period, setPeriod] = useState('Last 7 Days');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });

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
            <BarChart data={mockData} barCategoryGap="20%">
              <XAxis 
                dataKey="day" 
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
                {mockData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.day === today ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'}
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
