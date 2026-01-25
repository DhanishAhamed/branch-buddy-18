import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Palette, Save, Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
}

export default function WorkspaceSettings() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { refreshWorkspaces } = useWorkspace();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('workspaces')
      .select('*')
      .order('name');
    
    if (data) {
      setWorkspaces(data);
    }
    setIsLoading(false);
  };

  const updateWorkspace = (id: string, field: keyof Workspace, value: string) => {
    setWorkspaces(prev => prev.map(ws => 
      ws.id === id ? { ...ws, [field]: value } : ws
    ));
  };

  const handleSave = async (workspace: Workspace) => {
    setSavingId(workspace.id);
    
    const { error } = await supabase
      .from('workspaces')
      .update({
        name: workspace.name,
        logo_url: workspace.logo_url,
        primary_color: workspace.primary_color,
        secondary_color: workspace.secondary_color,
        accent_color: workspace.accent_color,
      })
      .eq('id', workspace.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save workspace settings',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: `${workspace.name} settings updated successfully`,
      });
      await refreshWorkspaces();
    }
    
    setSavingId(null);
  };

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspace Settings</h1>
          <p className="text-muted-foreground text-sm">Customize branding for each workspace</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6">
          {workspaces.map((workspace) => (
            <Card key={workspace.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: workspace.primary_color || 'hsl(var(--primary))' }}
                  >
                    {workspace.logo_url ? (
                      <img src={workspace.logo_url} alt={workspace.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <Building2 className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <CardTitle>{workspace.name}</CardTitle>
                    <CardDescription>{workspace.slug}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${workspace.id}`}>Workspace Name</Label>
                    <Input
                      id={`name-${workspace.id}`}
                      value={workspace.name}
                      onChange={(e) => updateWorkspace(workspace.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`logo-${workspace.id}`}>Logo URL</Label>
                    <Input
                      id={`logo-${workspace.id}`}
                      value={workspace.logo_url || ''}
                      onChange={(e) => updateWorkspace(workspace.id, 'logo_url', e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Brand Colors
                  </Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`primary-${workspace.id}`} className="text-xs text-muted-foreground">
                        Primary Color
                      </Label>
                      <div className="flex gap-2">
                        <div 
                          className="w-10 h-10 rounded-lg border border-border shrink-0"
                          style={{ backgroundColor: workspace.primary_color || '#8B5CF6' }}
                        />
                        <Input
                          id={`primary-${workspace.id}`}
                          type="text"
                          value={workspace.primary_color || '#8B5CF6'}
                          onChange={(e) => updateWorkspace(workspace.id, 'primary_color', e.target.value)}
                          placeholder="#8B5CF6"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`secondary-${workspace.id}`} className="text-xs text-muted-foreground">
                        Secondary Color
                      </Label>
                      <div className="flex gap-2">
                        <div 
                          className="w-10 h-10 rounded-lg border border-border shrink-0"
                          style={{ backgroundColor: workspace.secondary_color || '#A78BFA' }}
                        />
                        <Input
                          id={`secondary-${workspace.id}`}
                          type="text"
                          value={workspace.secondary_color || '#A78BFA'}
                          onChange={(e) => updateWorkspace(workspace.id, 'secondary_color', e.target.value)}
                          placeholder="#A78BFA"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`accent-${workspace.id}`} className="text-xs text-muted-foreground">
                        Accent Color
                      </Label>
                      <div className="flex gap-2">
                        <div 
                          className="w-10 h-10 rounded-lg border border-border shrink-0"
                          style={{ backgroundColor: workspace.accent_color || '#C4B5FD' }}
                        />
                        <Input
                          id={`accent-${workspace.id}`}
                          type="text"
                          value={workspace.accent_color || '#C4B5FD'}
                          onChange={(e) => updateWorkspace(workspace.id, 'accent_color', e.target.value)}
                          placeholder="#C4B5FD"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-3">
                  <Label>Preview</Label>
                  <div className="p-4 bg-muted/30 rounded-lg flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: workspace.primary_color || '#8B5CF6' }}
                    >
                      {workspace.logo_url ? (
                        <img src={workspace.logo_url} alt="Preview" className="w-8 h-8 object-contain" />
                      ) : (
                        <Building2 className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{workspace.name}</p>
                      <p className="text-sm text-muted-foreground">Real Estate CRM</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <div 
                        className="w-8 h-8 rounded-md"
                        style={{ backgroundColor: workspace.primary_color || '#8B5CF6' }}
                        title="Primary"
                      />
                      <div 
                        className="w-8 h-8 rounded-md"
                        style={{ backgroundColor: workspace.secondary_color || '#A78BFA' }}
                        title="Secondary"
                      />
                      <div 
                        className="w-8 h-8 rounded-md"
                        style={{ backgroundColor: workspace.accent_color || '#C4B5FD' }}
                        title="Accent"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSave(workspace)}
                    disabled={savingId === workspace.id}
                  >
                    {savingId === workspace.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
