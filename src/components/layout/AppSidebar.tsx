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
  ChevronRight,
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
import { Badge } from '@/components/ui/badge';

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
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

const portalItems = [
  { title: 'Commercial', url: '/portal/commercial', icon: Globe, color: 'text-blue-500' },
  { title: 'Residential', url: '/portal/residential', icon: Globe, color: 'text-green-500' },
  { title: 'Rentals', url: '/portal/rentals', icon: Globe, color: 'text-orange-500' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, isAdmin, signOut } = useAuth();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-gradient-to-b from-sidebar to-sidebar/95">
      <SidebarContent className="px-2">
        {/* Logo Section */}
        <SidebarGroup className="pt-4 pb-2">
          <div className={`flex items-center gap-3 px-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-foreground">Room4Calicut</h2>
                <p className="text-xs text-muted-foreground">Real Estate CRM</p>
              </div>
            )}
          </div>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 px-2">
            {!collapsed && 'Main Menu'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className={`group transition-all duration-200 ${isActive(item.url) ? 'bg-primary/10 text-primary shadow-sm' : 'hover:bg-muted/50'}`}
                  >
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 py-2.5"
                      activeClassName=""
                    >
                      <item.icon className={`h-5 w-5 transition-colors ${isActive(item.url) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {isActive(item.url) && <ChevronRight className="h-4 w-4 text-primary" />}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 px-2 flex items-center gap-2">
              {!collapsed && (
                <>
                  Admin
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Pro</Badge>
                </>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      className={`group transition-all duration-200 ${isActive(item.url) ? 'bg-primary/10 text-primary shadow-sm' : 'hover:bg-muted/50'}`}
                    >
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-3 py-2.5"
                        activeClassName=""
                      >
                        <item.icon className={`h-5 w-5 transition-colors ${isActive(item.url) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Portals Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 px-2">
            {!collapsed && 'Public Portals'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {portalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className={`group transition-all duration-200 ${isActive(item.url) ? 'bg-primary/10 text-primary shadow-sm' : 'hover:bg-muted/50'}`}
                  >
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 py-2.5"
                      activeClassName=""
                    >
                      <item.icon className={`h-5 w-5 transition-colors ${isActive(item.url) ? 'text-primary' : item.color}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Profile */}
      <SidebarFooter className="border-t border-border/50 p-3">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-muted/30 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold">
              {profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{isAdmin ? 'Administrator' : 'Staff'}</p>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={signOut} 
            className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}