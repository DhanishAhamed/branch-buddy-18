import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Users,
  MessageSquare,
  Map,
  Building2,
  Settings,
  LogOut,
  Kanban,
  Globe,
  Copy,
  Search,
  Palette,
  Contact,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Leads', url: '/leads', icon: Users },
  { title: 'Pipeline', url: '/pipeline', icon: Kanban },
  { title: 'Properties', url: '/properties', icon: Building2 },
  { title: 'Map Search', url: '/map', icon: Map },
  { title: 'Chat', url: '/chat', icon: MessageSquare },
];

const adminItems = [
  { title: 'User Management', url: '/admin/users', icon: Users },
  { title: 'Workspace Branding', url: '/admin/workspaces', icon: Palette },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

const portalItems = [
  { title: 'Commercial', url: '/portal/commercial', type: 'commercial' },
  { title: 'Residential', url: '/portal/residential', type: 'residential' },
  { title: 'Rentals', url: '/portal/rentals', type: 'rentals' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  const copyPortalLink = (type: string) => {
    const link = `${window.location.origin}/portal/${type}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied!', description: `${type} portal link copied to clipboard` });
  };

  // Check if user can view owner contacts
  const canViewOwners = profile?.can_view_owners || isAdmin;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="px-3">
        {/* Workspace Switcher */}
        <SidebarGroup className="pt-6 pb-4">
          <WorkspaceSwitcher collapsed={collapsed} />
        </SidebarGroup>

        {/* Search Bar */}
        {!collapsed && (
          <SidebarGroup className="pb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-foreground/60">
              <Search className="h-4 w-4" />
              <span className="text-sm">Search...</span>
              <span className="ml-auto text-xs bg-sidebar-background px-1.5 py-0.5 rounded">⌘K</span>
            </div>
          </SidebarGroup>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50 px-2 mb-2">
            {!collapsed && 'Main Menu'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className={`transition-all duration-200 ${isActive(item.url) ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
                  >
                    <NavLink to={item.url} className="flex items-center gap-3 py-2.5" activeClassName="">
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Owner Contacts - Only visible to users with permission */}
              {canViewOwners && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive('/admin/owners')}
                    className={`transition-all duration-200 ${isActive('/admin/owners') ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
                  >
                    <NavLink to="/admin/owners" className="flex items-center gap-3 py-2.5" activeClassName="">
                      <Contact className="h-5 w-5" />
                      {!collapsed && <span>Owner Contacts</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Portals Section with Copy Links */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50 px-2 mb-2">
            {!collapsed && 'Customer Portals'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {portalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <div className="flex items-center">
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      className={`flex-1 transition-all duration-200 ${isActive(item.url) ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
                    >
                      <NavLink to={item.url} className="flex items-center gap-3 py-2.5" activeClassName="">
                        <Globe className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                    {!collapsed && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        onClick={() => copyPortalLink(item.type)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50 px-2 mb-2">
              {!collapsed && 'Settings'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      className={`transition-all duration-200 ${isActive(item.url) ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
                    >
                      <NavLink to={item.url} className="flex items-center gap-3 py-2.5" activeClassName="">
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with User Profile */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className={`flex items-center gap-3 p-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.email}</p>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={signOut} 
            className="shrink-0 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
