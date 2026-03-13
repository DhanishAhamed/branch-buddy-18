import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home, Users, MessageSquare, Map, Building2, Settings, LogOut,
  Kanban, Globe, Copy, Search, Palette, Contact, CalendarDays,
  UserCheck, BookUser, Smartphone,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Leads', url: '/leads', icon: Users },
  { title: 'Pipeline', url: '/pipeline', icon: Kanban },
  { title: 'Properties', url: '/properties', icon: Building2 },
  { title: 'Map Search', url: '/map', icon: Map },
  { title: 'Chat', url: '/chat', icon: MessageSquare },
  { title: 'Calendar', url: '/calendar', icon: CalendarDays },
  { title: 'Customers', url: '/customers', icon: UserCheck },
];

const adminItems = [
  { title: 'Contact Book', url: '/contact-book', icon: BookUser },
  { title: 'User Management', url: '/admin/users', icon: Users },
  { title: 'Workspace Branding', url: '/admin/workspaces', icon: Palette },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

const getSearchItems = (slug: string) => [
  ...mainItems.map(i => ({ title: i.title, url: i.url })),
  ...adminItems.map(i => ({ title: i.title, url: i.url })),
  { title: 'Commercial', url: `/portal/commercial/${slug}`, type: 'commercial' },
  { title: 'Residential', url: `/portal/residential/${slug}`, type: 'residential' },
  { title: 'Owner Contacts', url: '/admin/owners' },
];

interface AppSidebarProps {
  onNavClick?: () => void;
}

export function AppSidebar({ onNavClick }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin, user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const collapsed = state === 'collapsed';
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leadCount, setLeadCount] = useState(0);

  const slug = activeWorkspace?.slug || '';
  const portalItems = [
    { title: 'Commercial', url: `/portal/commercial/${slug}`, type: 'commercial' },
    { title: 'Residential', url: `/portal/residential/${slug}`, type: 'residential' },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (user) {
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .not('status', 'in', '("closed_won","closed_lost")')
        .then(({ count }) => setLeadCount(count || 0));
    }
  }, [user]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const allSearchItems = useMemo(() => getSearchItems(slug), [slug]);

  const filteredItems = allSearchItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSelect = (url: string) => {
    navigate(url);
    setSearchOpen(false);
    setSearchQuery('');
    onNavClick?.();
  };

  const copyPortalLink = (type: string) => {
    const link = `${window.location.origin}/portal/${type}/${slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied!', description: `${type} portal link copied to clipboard` });
  };

  const canViewOwners = profile?.can_view_owners || isAdmin;

  const handleNavItemClick = () => {
    onNavClick?.();
  };

  const renderNavItem = (item: { title: string; url: string; icon: any }, showBadge?: boolean) => {
    const Icon = item.icon;
    const active = isActive(item.url);

    const content = (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={active}
          className={`relative transition-all duration-200 rounded-[10px] text-[13.5px] font-medium py-2.5 ${active
            ? 'bg-[hsl(var(--green-bg))] text-[hsl(var(--green-dark))] font-semibold'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
        >
          <NavLink to={item.url} className="flex items-center gap-3 py-2.5" activeClassName="" onClick={handleNavItemClick}>
            {active && (
              <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-sm bg-[hsl(var(--green-accent))]" />
            )}
            <Icon className={`h-4 w-4 ${active ? 'opacity-100' : 'opacity-70'}`} />
            {!collapsed && <span>{item.title}</span>}
            {!collapsed && showBadge && leadCount > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-[hsl(var(--green-accent))] text-white px-1.5 py-0.5 rounded-full">
                {leadCount > 99 ? '99+' : leadCount}
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );

    if (collapsed) {
      return (
        <TooltipProvider key={item.title}>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
        <SidebarContent className="px-3">
          <SidebarGroup className="pt-6 pb-4 border-b border-sidebar-border">
            <WorkspaceSwitcher collapsed={collapsed} />
          </SidebarGroup>

          {!collapsed && (
            <SidebarGroup className="py-3">
              <button
                onClick={() => { setSearchOpen(true); setSearchQuery(''); }}
                className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-muted text-muted-foreground w-full text-left hover:bg-muted/80 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span className="text-[13px]">Search...</span>
                <span className="ml-auto text-[10px] bg-border px-1.5 py-0.5 rounded">⌘K</span>
              </button>
            </SidebarGroup>
          )}

          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground px-2 mb-1.5 font-semibold">
              {!collapsed && 'Main Menu'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => renderNavItem(item, item.title === 'Leads'))}
                {canViewOwners && renderNavItem({ title: 'Owner Contacts', url: '/admin/owners', icon: Contact })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground px-2 mb-1.5 font-semibold">
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
                        className={`relative flex-1 transition-all duration-200 rounded-[10px] text-[13.5px] font-medium py-2.5 ${isActive(item.url)
                          ? 'bg-[hsl(var(--green-bg))] text-[hsl(var(--green-dark))] font-semibold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        <NavLink to={item.url} className="flex items-center gap-3 py-2.5" activeClassName="" onClick={handleNavItemClick}>
                          {isActive(item.url) && (
                            <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-sm bg-[hsl(var(--green-accent))]" />
                          )}
                          <Globe className={`h-4 w-4 ${isActive(item.url) ? 'opacity-100' : 'opacity-70'}`} />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                      {!collapsed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
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

          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground px-2 mb-1.5 font-semibold">
                {!collapsed && 'Settings'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => renderNavItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {!collapsed && (
            <SidebarGroup className="mt-auto pt-4">
              <div className="bg-[hsl(var(--green-dark))] rounded-[14px] p-3 text-white">
                <p className="text-[11px] font-semibold flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile App
                </p>
                <p className="text-[10px] opacity-70 mt-0.5">Manage leads on the go</p>
                <button className="w-full mt-2.5 text-center bg-white/15 border border-white/20 text-white text-[11px] font-semibold py-1.5 rounded-lg hover:bg-white/25 transition-colors">
                  Download App
                </button>
              </div>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className={`flex items-center gap-3 p-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--green-mid))] to-[hsl(var(--green-light))] text-white text-sm font-bold">
                {profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{profile?.full_name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
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

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md p-0 gap-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredItems.length > 0) {
                  handleSearchSelect(filteredItems[0].url);
                }
              }}
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-2">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
            ) : (
              filteredItems.map(item => (
                <button
                  key={item.url}
                  onClick={() => handleSearchSelect(item.url)}
                  className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3"
                >
                  {item.title}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
