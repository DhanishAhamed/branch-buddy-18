import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Phone, Mail, User, Clock, ExternalLink } from 'lucide-react';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { formatDistanceToNow } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'New' },
  contacted: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', label: 'Contacted' },
  qualified: { bg: 'bg-purple-500/10', text: 'text-purple-600', label: 'Qualified' },
  site_visit_scheduled: { bg: 'bg-primary/10', text: 'text-primary', label: 'Site Visit' },
  negotiating: { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Negotiating' },
  closed_won: { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Won 🎉' },
  closed_lost: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Lost' },
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground text-sm">{filteredLeads.length} leads in your pipeline</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Leads List */}
      <div className="grid gap-3">
        {filteredLeads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No leads found</h3>
              <p className="text-muted-foreground text-sm">Start adding leads to grow your business</p>
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map((lead) => {
            const status = statusConfig[lead.status] || statusConfig.new;
            
            return (
              <Card key={lead.id} className="hover:shadow-md transition-all duration-200 group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Lead Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {lead.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          {lead.email && (
                            <a 
                              href={`mailto:${lead.email}`}
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[180px]">{lead.email}</span>
                            </a>
                          )}
                          {lead.phone && (
                            <a 
                              href={`tel:${lead.phone}`}
                              className="flex items-center gap-1.5 text-primary hover:underline font-medium"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {lead.phone}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                          </span>
                          {lead.source && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              via {lead.source}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <Badge className={`${status.bg} ${status.text} border-0 shrink-0`}>
                      {status.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
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