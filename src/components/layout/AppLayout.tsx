import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from './ThemeToggle';
import { useDevice } from '@/hooks/use-device';
import { Loader2, Search, Mail } from 'lucide-react';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { QuickActionsDropdown } from '@/components/dashboard/QuickActionsDropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isLoading, profile } = useAuth();
  const { isMobile, isTablet, isDesktop } = useDevice();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const showSidebar = isDesktop || isTablet;
  const showBottomNav = isMobile;

  return (
    <SidebarProvider defaultOpen={isDesktop}>
      <div className="flex min-h-screen w-full">
        {showSidebar && <AppSidebar />}
        
        <div className="flex-1 flex flex-col min-w-0">
          {showSidebar && (
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card sticky top-0 z-50 shrink-0">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                {/* Search box in topbar */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-muted text-muted-foreground w-64">
                  <Search className="h-3.5 w-3.5" />
                  <span className="text-[13px]">Search leads, properties...</span>
                  <span className="ml-auto text-[10px] bg-border px-1.5 py-0.5 rounded">⌘K</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-[10px] bg-muted hover:bg-border">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </Button>
                <NotificationBell />
                {/* User pill */}
                <div className="hidden md:flex items-center gap-2 bg-muted rounded-full py-1 pl-1 pr-3 cursor-pointer">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--green-mid))] to-[hsl(var(--green-light))] text-white text-[11px] font-bold">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground leading-tight truncate max-w-[120px]">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">
                      {profile?.email}
                    </p>
                  </div>
                </div>
                <QuickActionsDropdown />
                <ThemeToggle />
              </div>
            </header>
          )}
          
          <main className={`flex-1 overflow-auto ${showBottomNav ? 'pb-20' : ''}`}>
            {children}
          </main>
          
          {showBottomNav && <BottomNav />}
        </div>
      </div>
    </SidebarProvider>
  );
}
