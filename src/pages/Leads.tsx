import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Phone, Mail, User } from 'lucide-react';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600',
  contacted: 'bg-yellow-500/10 text-yellow-600',
  qualified: 'bg-purple-500/10 text-purple-600',
  site_visit_scheduled: 'bg-primary/10 text-primary',
  negotiating: 'bg-orange-500/10 text-orange-600',
  closed_won: 'bg-green-500/10 text-green-600',
  closed_lost: 'bg-destructive/10 text-destructive',
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.branch_id) {
      fetchLeads();
    }
  }, [profile]);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setLeads(data);
  };

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone?.includes(searchQuery)
  );

  const formatStatus = (status: string) => 
    status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-3">
        {filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No leads found</p>
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{lead.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <a 
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <Badge className={statusColors[lead.status] || 'bg-muted'}>
                    {formatStatus(lead.status)}
                  </Badge>
                </div>
                {lead.source && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Source: {lead.source}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddLeadDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
