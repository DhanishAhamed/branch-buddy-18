import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from './ThemeToggle';
import { useDevice } from '@/hooks/use-device';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isLoading } = useAuth();
  const { isMobile, isTablet, isDesktop } = useDevice();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show sidebar on desktop and tablet, bottom nav only on mobile
  const showSidebar = isDesktop || isTablet;
  const showBottomNav = isMobile;

  return (
    <SidebarProvider defaultOpen={isDesktop}>
      <div className="flex min-h-screen w-full">
        {showSidebar && <AppSidebar />}
        
        <div className="flex-1 flex flex-col min-w-0">
          {showSidebar && (
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card shrink-0">
              <div className="flex items-center">
                <SidebarTrigger />
                <h1 className="ml-4 font-semibold text-foreground hidden md:block">Room4Calicut CRM</h1>
                <h1 className="ml-4 font-semibold text-foreground md:hidden">CRM</h1>
              </div>
              <ThemeToggle />
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
