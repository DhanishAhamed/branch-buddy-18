import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Get user's workspace memberships
    const { data: memberships } = await supabase
      .from('user_workspaces')
      .select('workspace_id, is_active')
      .eq('user_id', user.id);

    if (memberships && memberships.length > 0) {
      const workspaceIds = memberships.map(m => m.workspace_id);
      
      // Fetch workspace details
      const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds);

      if (workspaceData) {
        setWorkspaces(workspaceData);
        
        // Find active workspace
        const activeMembership = memberships.find(m => m.is_active);
        if (activeMembership) {
          const activeWs = workspaceData.find(w => w.id === activeMembership.workspace_id);
          setActiveWorkspace(activeWs || workspaceData[0]);
        } else if (workspaceData.length > 0) {
          // Set first workspace as active if none is set
          setActiveWorkspace(workspaceData[0]);
          await switchWorkspace(workspaceData[0].id);
        }
      }
    } else {
      // User has no workspaces yet - they'll need to be assigned by admin
      setWorkspaces([]);
      setActiveWorkspace(null);
    }
    
    setIsLoading(false);
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!user) return;

    // Call the RPC function to set active workspace
    await supabase.rpc('set_active_workspace', {
      _user_id: user.id,
      _workspace_id: workspaceId
    });

    const newActiveWorkspace = workspaces.find(w => w.id === workspaceId);
    if (newActiveWorkspace) {
      setActiveWorkspace(newActiveWorkspace);
    }
  };

  const refreshWorkspaces = async () => {
    await fetchWorkspaces();
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      isLoading,
      switchWorkspace,
      refreshWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
