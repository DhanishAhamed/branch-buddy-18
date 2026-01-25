import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Plus } from 'lucide-react';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface DashboardHeaderProps {
  onLeadAdded?: () => void;
}

export function DashboardHeader({ onLeadAdded }: DashboardHeaderProps) {
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  const handleLeadSuccess = () => {
    onLeadAdded?.();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
          <Button onClick={() => setAddLeadOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      <AddLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        onSuccess={handleLeadSuccess}
      />
    </>
  );
}
