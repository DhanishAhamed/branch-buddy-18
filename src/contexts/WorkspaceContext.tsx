import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
}

type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer' | null;

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  currentWorkspace: Workspace | null; // alias for activeWorkspace
  workspaceId: string | null;
  isLoading: boolean;
  isSwitching: boolean;
  userRole: WorkspaceRole;
  hasAccess: (workspaceId: string) => boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  setCurrentWorkspace: (w: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY = 'currentWorkspaceId';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  // Start as true — stays true until auth AND workspace fetch both complete
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [userRole, setUserRole] = useState<WorkspaceRole>(null);
  const [membershipMap, setMembershipMap] = useState<Map<string, string>>(new Map());

  const fetchWorkspaces = async () => {
    // Wait for auth to settle before deciding there's no user
    if (authLoading) return;

    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setUserRole(null);
      setMembershipMap(new Map());
      setIsLoading(false);
      return;
    }


    setIsLoading(true);

    // Get user's workspace memberships
    const { data: memberships } = await supabase
      .from('user_workspaces')
      .select('workspace_id, is_active, role')
      .eq('user_id', user.id);

    if (memberships && memberships.length > 0) {
      const workspaceIds = memberships.map(m => m.workspace_id);

      // Build membership role map
      const roleMap = new Map<string, string>();
      memberships.forEach(m => {
        roleMap.set(m.workspace_id, m.role || 'member');
      });
      setMembershipMap(roleMap);

      // Fetch workspace details
      const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds);

      if (workspaceData) {
        setWorkspaces(workspaceData);

        // Find active workspace - check DB first, then localStorage, then default to first
        const activeMembership = memberships.find(m => m.is_active);
        const storedWorkspaceId = localStorage.getItem(STORAGE_KEY);

        let selectedWorkspace: Workspace | null = null;

        if (activeMembership) {
          selectedWorkspace = workspaceData.find(w => w.id === activeMembership.workspace_id) || null;
        }

        if (!selectedWorkspace && storedWorkspaceId) {
          selectedWorkspace = workspaceData.find(w => w.id === storedWorkspaceId) || null;
        }

        if (!selectedWorkspace && workspaceData.length > 0) {
          selectedWorkspace = workspaceData[0];
          await switchWorkspaceInDb(selectedWorkspace.id);
        }

        setActiveWorkspace(selectedWorkspace);
        if (selectedWorkspace) {
          setUserRole((roleMap.get(selectedWorkspace.id) || 'member') as WorkspaceRole);
          localStorage.setItem(STORAGE_KEY, selectedWorkspace.id);
        }
      }
    } else {
      // User has no workspaces yet - they'll need to be assigned by admin
      setWorkspaces([]);
      setActiveWorkspace(null);
      setUserRole(null);
      setMembershipMap(new Map());
    }

    setIsLoading(false);
  };

  const switchWorkspaceInDb = async (workspaceId: string) => {
    if (!user) return;

    try {
      await supabase.rpc('set_active_workspace', {
        _user_id: user.id,
        _workspace_id: workspaceId
      });
    } catch (error) {
      console.error('Error switching workspace in DB:', error);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!user || isSwitching) return;

    setIsSwitching(true);

    try {
      // Call the RPC function to set active workspace in database FIRST
      const { error } = await supabase.rpc('set_active_workspace', {
        _user_id: user.id,
        _workspace_id: workspaceId
      });

      if (error) {
        console.error('Error switching workspace:', error);
        return;
      }

      // Only update local state AFTER database is updated
      const newActiveWorkspace = workspaces.find(w => w.id === workspaceId);
      if (newActiveWorkspace) {
        setActiveWorkspace(newActiveWorkspace);
        setUserRole((membershipMap.get(workspaceId) || 'member') as WorkspaceRole);
        localStorage.setItem(STORAGE_KEY, workspaceId);
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const setCurrentWorkspace = (w: Workspace) => {
    switchWorkspace(w.id);
  };

  const hasAccess = (wsId: string): boolean => {
    return membershipMap.has(wsId);
  };

  const refreshWorkspaces = async () => {
    await fetchWorkspaces();
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user, authLoading]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      currentWorkspace: activeWorkspace,
      workspaceId: activeWorkspace?.id ?? null,
      isLoading,
      isSwitching,
      userRole,
      hasAccess,
      switchWorkspace,
      setCurrentWorkspace,
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
