import { useState } from 'react';
import { Plus, Building2, CalendarPlus, UserPlus, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { AddPropertyDialog } from '@/components/properties/AddPropertyDialog';

interface QuickActionsDropdownProps {
  onActionComplete?: () => void;
}

export function QuickActionsDropdown({ onActionComplete }: QuickActionsDropdownProps) {
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);

  const handleActionSuccess = () => {
    onActionComplete?.();
  };

  const actions = [
    {
      label: 'Add New Lead',
      icon: UserPlus,
      onClick: () => setAddLeadOpen(true),
      description: 'Create a new lead record',
    },
    {
      label: 'Add Property',
      icon: Building2,
      onClick: () => setAddPropertyOpen(true),
      description: 'List a new property',
    },
    {
      label: 'Schedule Visit',
      icon: CalendarPlus,
      onClick: () => {
        window.location.href = '/pipeline';
      },
      description: 'Book a site visit',
    },
    {
      label: 'Create Task',
      icon: FileText,
      onClick: () => {
        window.location.href = '/dashboard';
      },
      description: 'Add a new task',
    },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 bg-[hsl(var(--green-dark))] text-white border-0 rounded-[10px] px-4 py-2 text-[13px] font-semibold hover:bg-[hsl(var(--green-mid))] transition-colors">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Quick Actions
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover border-border z-50">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Create New
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              onClick={action.onClick}
              className="flex items-start gap-3 cursor-pointer py-2.5"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AddLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        onSuccess={handleActionSuccess}
      />

      <AddPropertyDialog
        open={addPropertyOpen}
        onOpenChange={setAddPropertyOpen}
        onSuccess={handleActionSuccess}
      />
    </>
  );
}
