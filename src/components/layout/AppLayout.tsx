import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from './ThemeToggle';
import { useDevice } from '@/hooks/use-device';
import { Loader2, Search, Mail, Menu, X, Plus } from 'lucide-react';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { QuickActionsDropdown } from '@/components/dashboard/QuickActionsDropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isLoading, profile } = useAuth();
  const { isMobile, isTablet, isDesktop } = useDevice();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="flex flex-col min-h-screen w-full">
          {/* Mobile Topbar */}
          <header className="h-14 flex items-center justify-between border-b border-border px-3 bg-card sticky top-0 z-30 shrink-0 pt-safe">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex items-center justify-center h-10 w-10 rounded-[10px] bg-muted"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <span className="text-sm font-bold text-foreground">Room4Calicut</span>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--green-mid))] to-[hsl(var(--green-light))] text-white text-[11px] font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Mobile sidebar overlay + slide-in */}
          <div className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
          <div className={`mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="flex items-center justify-end p-3">
              <button onClick={() => setMobileMenuOpen(false)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <AppSidebar onNavClick={() => setMobileMenuOpen(false)} />
          </div>

          <main className="flex-1 overflow-auto pb-20">
            {children}
          </main>

          <BottomNav />

          {/* FAB for Quick Actions */}
          <div className="fab-button" onClick={() => setFabOpen(!fabOpen)}>
            <Plus className="h-6 w-6" />
          </div>
          {fabOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setFabOpen(false)} />
              <div className="fixed bottom-36 right-4 z-40 bg-card border border-border rounded-2xl shadow-xl p-2 w-56 mb-safe">
                <QuickActionsDropdown />
              </div>
            </>
          )}
        </div>
      </SidebarProvider>
    );
  }

  // Tablet + Desktop layout
  return (
    <SidebarProvider defaultOpen={isDesktop}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card sticky top-0 z-50 shrink-0 pt-safe">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {/* Search box in topbar */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-muted text-muted-foreground w-64 xl:w-80">
                <Search className="h-3.5 w-3.5" />
                <span className="text-[13px]">Search leads, properties...</span>
                {isDesktop && <span className="ml-auto text-[10px] bg-border px-1.5 py-0.5 rounded">⌘K</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 xl:gap-3">
              {isDesktop && (
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-[10px] bg-muted hover:bg-border">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
              <NotificationBell />
              {/* User pill */}
              <div className="hidden lg:flex items-center gap-2 bg-muted rounded-full py-1 pl-1 pr-3 cursor-pointer">
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
                  {isDesktop && (
                    <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">
                      {profile?.email}
                    </p>
                  )}
                </div>
              </div>
              {/* Tablet: avatar only */}
              {isTablet && (
                <Avatar className="h-8 w-8 lg:hidden">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--green-mid))] to-[hsl(var(--green-light))] text-white text-[11px] font-bold">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              <QuickActionsDropdown />
              <ThemeToggle />
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
