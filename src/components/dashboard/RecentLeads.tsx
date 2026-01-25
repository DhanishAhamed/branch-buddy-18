import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface Lead {
  id: string;
  name: string;
  status: string;
  source: string | null;
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
        property:properties(title)
      `)
      .eq('assigned_to', user?.id)
      .order('created_at', { ascending: false })
      .limit(4);

    if (data) {
      setLeads(data as Lead[]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0">New</Badge>;
      case 'contacted':
      case 'qualified':
        return <Badge className="bg-accent text-accent-foreground hover:bg-accent/80 border-0">Active</Badge>;
      case 'negotiating':
        return <Badge className="bg-warning/15 text-warning hover:bg-warning/20 border-0">Negotiating</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Recent Leads</CardTitle>
        <Link to="/leads" className="text-sm font-medium text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {leads.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            No recent leads
          </p>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 bg-primary/15">
                  <AvatarFallback className="text-xs font-medium text-primary bg-primary/15">
                    {getInitials(lead.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground text-sm">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lead.property?.title 
                      ? `Interested in: ${lead.property.title}`
                      : lead.source 
                        ? `Contacted via: ${lead.source}`
                        : 'New inquiry'
                    }
                  </p>
                </div>
              </div>
              {getStatusBadge(lead.status)}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
