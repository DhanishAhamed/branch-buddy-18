import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, Building2 } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  branch_id: string | null;
  is_approved: boolean;
  can_view_owners: boolean;
}

interface Branch {
  id: string;
  name: string;
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, branchesRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('branches').select('id, name'),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (branchesRes.data) setBranches(branchesRes.data);
  };

  const updateProfile = async (userId: string, updates: Partial<Profile>) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: 'User updated successfully' });
      fetchData();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        User Management
      </h1>

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{profile.full_name || 'No Name'}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>

                <Select
                  value={profile.branch_id || 'none'}
                  onValueChange={(val) => updateProfile(profile.user_id, { branch_id: val === 'none' ? null : val })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Assign Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Branch</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <span className="text-sm">Approved</span>
                  <Switch
                    checked={profile.is_approved}
                    onCheckedChange={(checked) => updateProfile(profile.user_id, { is_approved: checked })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm">View Owners</span>
                  <Switch
                    checked={profile.can_view_owners}
                    onCheckedChange={(checked) => updateProfile(profile.user_id, { can_view_owners: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
