import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Plus, Search, Phone, Mail, User, Clock, ExternalLink, Upload, Filter } from 'lucide-react';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { BulkImportDialog } from '@/components/leads/BulkImportDialog';
import { formatDistanceToNow } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  created_at: string;
  branch_id: string;
  assigned_to: string | null;
}

interface Branch {
  id: string;
  name: string;
  city: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const { profile, isAdmin } = useAuth();
  const { activeWorkspace } = useWorkspace();

  useEffect(() => {
    if (profile?.branch_id || isAdmin) {
      fetchData();
    }
  }, [profile, isAdmin, activeWorkspace?.id]);

  const fetchData = async () => {
    const [leadsRes, branchesRes, profilesRes] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('branches').select('*'),
      supabase.from('profiles').select('id, user_id, full_name'),
    ]);
    
    if (leadsRes.data) setLeads(leadsRes.data);
    if (branchesRes.data) setBranches(branchesRes.data);
    if (profilesRes.data) setStaffProfiles(profilesRes.data);
  };

  const getCityForBranch = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.city || 'Unknown';
  };

  const getStaffName = (userId: string | null) => {
    if (!userId) return null;
    return staffProfiles.find(p => p.user_id === userId)?.full_name || 'Unknown';
  };

  // Filter leads based on user role and filters
  let filteredLeads = leads;
  
  // Non-admin users can only see leads from their branch
  if (!isAdmin && profile?.branch_id) {
    filteredLeads = filteredLeads.filter(lead => lead.branch_id === profile.branch_id);
  }

  // Apply city filter (admin only)
  if (isAdmin && filterCity !== 'all') {
    filteredLeads = filteredLeads.filter(lead => lead.branch_id === filterCity);
  }

  // Apply staff filter (admin only)
  if (isAdmin && filterStaff !== 'all') {
    filteredLeads = filteredLeads.filter(lead => lead.assigned_to === filterStaff);
  }

  // Apply search filter
  filteredLeads = filteredLeads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone?.includes(searchQuery)
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground text-sm">{filteredLeads.length} leads in your pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <Button 
              variant={showFilters ? "secondary" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          )}
        </div>

        {/* Admin Filters */}
        {isAdmin && showFilters && (
          <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStaff} onValueChange={setFilterStaff}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staffProfiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || 'Unknown'}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" onClick={() => { setFilterCity('all'); setFilterStaff('all'); }}>
              Clear
            </Button>
          </div>
        )}
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
            const city = getCityForBranch(lead.branch_id);
            const assignedTo = getStaffName(lead.assigned_to);
            
            return (
              <Card key={lead.id} className="hover:shadow-md transition-all duration-200 group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Lead Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
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
                          {isAdmin && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {city}
                            </Badge>
                          )}
                          {assignedTo && (
                            <span className="text-[10px]">→ {assignedTo}</span>
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
        onSuccess={fetchData}
      />
      
      <BulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
