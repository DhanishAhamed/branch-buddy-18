import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, Plus, Trash2, MapPin, Building2, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceAssignDialog } from '@/components/admin/WorkspaceAssignDialog';
import { OwnerContactsSection } from '@/components/admin/OwnerContactsSection';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  branch_id: string | null;
  is_approved: boolean;
  can_view_owners: boolean;
  can_edit_properties: boolean;
  pipeline_access: 'sales' | 'ops' | 'both';
}

interface Branch {
  id: string;
  name: string;
  city: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'staff';
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [selectedUserForWorkspace, setSelectedUserForWorkspace] = useState<Profile | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, branchesRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('branches').select('*'),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (branchesRes.data) setBranches(branchesRes.data);
    if (rolesRes.data) setUserRoles(rolesRes.data as UserRole[]);
  };

  const getUserRole = (userId: string) => {
    return userRoles.find(r => r.user_id === userId)?.role || 'staff';
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

  const updateUserRole = async (userId: string, newRole: 'admin' | 'staff') => {
    // Check if role exists
    const existingRole = userRoles.find(r => r.user_id === userId);
    
    if (existingRole) {
      await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
    } else {
      await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
    }
    
    toast({ title: 'Role Updated', description: `User role set to ${newRole}` });
    fetchData();
  };

  const deleteUser = async (userId: string) => {
    // Just remove from profiles - auth user remains
    const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to remove user', variant: 'destructive' });
    } else {
      toast({ title: 'Removed', description: 'User removed successfully' });
      await supabase.from('user_roles').delete().eq('user_id', userId);
      fetchData();
    }
  };

  const getCityForBranch = (branchId: string | null) => {
    if (!branchId) return 'No City';
    return branches.find(b => b.id === branchId)?.city || 'Unknown';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          User Management
        </h1>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="owners" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Owner Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Users List */}
          <div className="grid gap-4">
            {profiles.map((profile) => {
              const userRole = getUserRole(profile.user_id);
              const city = getCityForBranch(profile.branch_id);
              
              return (
                <Card key={profile.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* User Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {profile.full_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{profile.full_name || 'No Name'}</h3>
                          <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {city}
                          </div>
                        </div>
                      </div>

                      {/* Role Select */}
                      <Select
                        value={userRole}
                        onValueChange={(val) => updateUserRole(profile.user_id, val as 'admin' | 'staff')}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Branch/City Select */}
                      <Select
                        value={profile.branch_id || 'none'}
                        onValueChange={(val) => updateProfile(profile.user_id, { branch_id: val === 'none' ? null : val })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Assign City" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No City</SelectItem>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.city} - {b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Workspace Assignment */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { 
                          setSelectedUserForWorkspace(profile); 
                          setWorkspaceDialogOpen(true); 
                        }}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Workspaces
                      </Button>

                      {/* Access Controls */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { setSelectedUser(profile); setIsDialogOpen(true); }}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Permissions
                      </Button>

                      {/* Delete */}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => deleteUser(profile.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {profiles.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="owners">
          <OwnerContactsSection />
        </TabsContent>
      </Tabs>

      {/* Permissions Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              User Permissions
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedUser.full_name || 'No Name'}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Account Approved</Label>
                    <p className="text-xs text-muted-foreground">Allow user to access the system</p>
                  </div>
                  <Switch
                    checked={selectedUser.is_approved}
                    onCheckedChange={(checked) => {
                      updateProfile(selectedUser.user_id, { is_approved: checked });
                      setSelectedUser({ ...selectedUser, is_approved: checked });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>View Owner Details</Label>
                    <p className="text-xs text-muted-foreground">Can see property owner information</p>
                  </div>
                  <Switch
                    checked={selectedUser.can_view_owners}
                    onCheckedChange={(checked) => {
                      updateProfile(selectedUser.user_id, { can_view_owners: checked });
                      setSelectedUser({ ...selectedUser, can_view_owners: checked });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Edit Properties</Label>
                    <p className="text-xs text-muted-foreground">Can modify property listings</p>
                  </div>
                  <Switch
                    checked={selectedUser.can_edit_properties}
                    onCheckedChange={(checked) => {
                      updateProfile(selectedUser.user_id, { can_edit_properties: checked });
                      setSelectedUser({ ...selectedUser, can_edit_properties: checked });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pipeline Access</Label>
                  <Select
                    value={selectedUser.pipeline_access}
                    onValueChange={(val: 'sales' | 'ops' | 'both') => {
                      updateProfile(selectedUser.user_id, { pipeline_access: val });
                      setSelectedUser({ ...selectedUser, pipeline_access: val });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ops">Operations Only</SelectItem>
                      <SelectItem value="sales">Sales Only</SelectItem>
                      <SelectItem value="both">Both Pipelines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="w-full" onClick={() => setIsDialogOpen(false)}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Workspace Assignment Dialog */}
      {selectedUserForWorkspace && (
        <WorkspaceAssignDialog
          open={workspaceDialogOpen}
          onOpenChange={setWorkspaceDialogOpen}
          userId={selectedUserForWorkspace.user_id}
          userName={selectedUserForWorkspace.full_name}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
