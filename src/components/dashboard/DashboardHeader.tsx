import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { QuickActionsDropdown } from './QuickActionsDropdown';
import { NotificationBell } from './NotificationBell';

interface DashboardHeaderProps {
  onLeadAdded?: () => void;
}

export function DashboardHeader({ onLeadAdded }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <Breadcrumb className="mt-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-muted-foreground hover:text-foreground">
                MAIN
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-primary font-medium">OVERVIEW</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <NotificationBell />
        <QuickActionsDropdown onActionComplete={onLeadAdded} />
      </div>
    </div>
  );
}
