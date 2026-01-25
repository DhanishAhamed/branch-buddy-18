import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Rocket, Loader2 } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface UserWorkspace {
  workspace_id: string;
  role: string;
}

interface WorkspaceAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string | null;
  onSuccess: () => void;
}

export function WorkspaceAssignDialog({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  onSuccess 
}: WorkspaceAssignDialogProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [userWorkspaces, setUserWorkspaces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      fetchData();
    }
  }, [open, userId]);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [workspacesRes, userWorkspacesRes] = await Promise.all([
      supabase.from('workspaces').select('id, name, slug, logo_url, primary_color'),
      supabase.from('user_workspaces').select('workspace_id').eq('user_id', userId)
    ]);

    if (workspacesRes.data) {
      setWorkspaces(workspacesRes.data);
    }
    
    if (userWorkspacesRes.data) {
      setUserWorkspaces(userWorkspacesRes.data.map(uw => uw.workspace_id));
    }
    
    setIsLoading(false);
  };

  const getWorkspaceIcon = (slug: string) => {
    switch (slug) {
      case 'spacecraft':
        return Rocket;
      default:
        return Building2;
    }
  };

  const toggleWorkspace = (workspaceId: string) => {
    setUserWorkspaces(prev => 
      prev.includes(workspaceId)
        ? prev.filter(id => id !== workspaceId)
        : [...prev, workspaceId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Delete existing assignments for this user
      await supabase
        .from('user_workspaces')
        .delete()
        .eq('user_id', userId);
      
      // Insert new assignments
      if (userWorkspaces.length > 0) {
        const assignments = userWorkspaces.map((workspaceId, index) => ({
          user_id: userId,
          workspace_id: workspaceId,
          role: 'member',
          is_active: index === 0 // First one is active by default
        }));
        
        const { error } = await supabase
          .from('user_workspaces')
          .insert(assignments);
        
        if (error) throw error;
      }
      
      toast({
        title: 'Workspaces Updated',
        description: `${userName || 'User'} now has access to ${userWorkspaces.length} workspace(s)`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving workspaces:', error);
      toast({
        title: 'Error',
        description: 'Failed to update workspace assignments',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Assign Workspaces
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-medium">{userName || 'No Name'}</p>
            <p className="text-sm text-muted-foreground">Select which workspaces this user can access</p>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {workspaces.map((workspace) => {
                const Icon = getWorkspaceIcon(workspace.slug);
                const isAssigned = userWorkspaces.includes(workspace.id);
                
                return (
                  <div
                    key={workspace.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isAssigned 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-background border-border hover:border-primary/20'
                    }`}
                    onClick={() => toggleWorkspace(workspace.id)}
                  >
                    <Checkbox
                      checked={isAssigned}
                      onCheckedChange={() => toggleWorkspace(workspace.id)}
                    />
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ 
                        backgroundColor: workspace.primary_color || 'hsl(var(--primary))' 
                      }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{workspace.name}</p>
                      <p className="text-xs text-muted-foreground">{workspace.slug}</p>
                    </div>
                  </div>
                );
              })}
              
              {workspaces.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No workspaces available
                </p>
              )}
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
