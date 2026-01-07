import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GripVertical, User, Phone } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  pipeline: string | null;
}

const opsStages = ['new', 'contacted', 'qualified', 'site_visit_scheduled'];
const salesStages = ['site_visit_scheduled', 'negotiating', 'closed_won', 'closed_lost'];

const stageLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  site_visit_scheduled: 'Site Visit',
  negotiating: 'Negotiating',
  closed_won: 'Won',
  closed_lost: 'Lost',
};

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState('ops');
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.branch_id) {
      fetchLeads();
    }
  }, [profile]);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, name, phone, status, pipeline')
      .order('created_at', { ascending: false });
    
    if (data) setLeads(data);
  };

  const updateLeadStatus = async (leadId: string, newStatus: 'new' | 'contacted' | 'qualified' | 'site_visit_scheduled' | 'negotiating' | 'closed_won' | 'closed_lost') => {
    await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', leadId);
    
    fetchLeads();
  };

  const getLeadsByStage = (stage: string) => 
    leads.filter(lead => lead.status === stage);

  const stages = activeTab === 'ops' ? opsStages : salesStages;

  const canAccess = profile?.pipeline_access === 'both' || profile?.pipeline_access === activeTab;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger 
            value="ops"
            disabled={profile?.pipeline_access === 'sales'}
          >
            Operational
          </TabsTrigger>
          <TabsTrigger 
            value="sales"
            disabled={profile?.pipeline_access === 'ops'}
          >
            Sales
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 overflow-x-auto">
          {canAccess ? (
            <div className="flex gap-4 min-w-max h-full pb-4">
              {stages.map(stage => (
                <div key={stage} className="w-72 flex-shrink-0">
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        {stageLabels[stage]}
                        <Badge variant="secondary" className="ml-2">
                          {getLeadsByStage(stage).length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
                      {getLeadsByStage(stage).map(lead => (
                        <div
                          key={lead.id}
                          className="p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate flex items-center gap-2">
                                <User className="h-3 w-3" />
                                {lead.name}
                              </p>
                              {lead.phone && (
                                <a 
                                  href={`tel:${lead.phone}`}
                                  className="text-xs text-primary flex items-center gap-1 mt-1"
                                >
                                  <Phone className="h-3 w-3" />
                                  {lead.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {getLeadsByStage(stage).length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-8">
                          No leads
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">You don't have access to this pipeline.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
