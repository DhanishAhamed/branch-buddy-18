import { useState } from 'react';
import { Check, ChevronDown, Building2, Rocket } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { workspaces, activeWorkspace, switchWorkspace, isLoading } = useWorkspace();
  const [open, setOpen] = useState(false);

  const getWorkspaceIcon = (slug: string) => {
    switch (slug) {
      case 'spacecraft':
        return Rocket;
      default:
        return Building2;
    }
  };

  const handleSwitch = async (workspaceId: string) => {
    await switchWorkspace(workspaceId);
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-3 px-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 bg-primary/20 rounded-xl animate-pulse" />
        {!collapsed && (
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            <div className="h-3 bg-muted rounded w-16 mt-1 animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className={`flex items-center gap-3 px-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm text-muted-foreground">No Workspace</p>
            <p className="text-xs text-muted-foreground/60">Contact admin</p>
          </div>
        )}
      </div>
    );
  }

  const ActiveIcon = getWorkspaceIcon(activeWorkspace.slug);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full p-2 h-auto hover:bg-sidebar-accent",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <ActiveIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 text-left ml-3">
                <p className="font-semibold text-sidebar-foreground text-sm">{activeWorkspace.name}</p>
                <p className="text-xs text-sidebar-foreground/60">Real Estate CRM</p>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/60 shrink-0" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-popover border-border z-50">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Switch Workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => {
          const Icon = getWorkspaceIcon(workspace.slug);
          const isActive = workspace.id === activeWorkspace.id;
          
          return (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleSwitch(workspace.id)}
              className={cn(
                "flex items-center gap-3 cursor-pointer py-2.5",
                isActive && "bg-primary/10"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isActive ? "bg-primary" : "bg-muted"
              )}>
                <Icon className={cn(
                  "h-4 w-4",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{workspace.name}</p>
                <p className="text-xs text-muted-foreground">{workspace.slug}</p>
              </div>
              {isActive && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
