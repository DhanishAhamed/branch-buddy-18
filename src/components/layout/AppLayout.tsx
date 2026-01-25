import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from './ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isLoading } = useAuth();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {!isMobile && <AppSidebar />}
        
        <div className="flex-1 flex flex-col">
          {!isMobile && (
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card">
              <div className="flex items-center">
                <SidebarTrigger />
                <h1 className="ml-4 font-semibold text-foreground">Room4Calicut CRM</h1>
              </div>
              <ThemeToggle />
            </header>
          )}
          
          <main className={`flex-1 overflow-auto ${isMobile ? 'pb-20' : ''}`}>
            {children}
          </main>
          
          {isMobile && <BottomNav />}
        </div>
      </div>
    </SidebarProvider>
  );
}
