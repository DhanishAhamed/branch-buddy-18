import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Phone, MessageSquare, Building2, UserCheck } from 'lucide-react';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Property {
  id: string;
  title: string;
  address: string | null;
}

interface StatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromStatus: string;
  toStatus: string;
  leadName: string;
  properties?: Property[];
  onConfirm: (data: {
    callNotes: string;
    customerResponse?: string;
    followupAt?: Date;
    propertyId?: string;
    siteVisitTime?: Date;
    assignedStaffId?: string;
  }) => void;
}

export function StatusTransitionDialog({
  open,
  onOpenChange,
  fromStatus,
  toStatus,
  leadName,
  properties = [],
  onConfirm,
}: StatusTransitionDialogProps) {
  const [callNotes, setCallNotes] = useState('');
  const [customerResponse, setCustomerResponse] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [siteVisitDate, setSiteVisitDate] = useState('');
  const [siteVisitTime, setSiteVisitTime] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [opsStaff, setOpsStaff] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const { profile } = useAuth();

  const showFollowup = toStatus === 'contacted' || toStatus === 'qualified' || toStatus === 'need_followup';
  const showProperty = toStatus === 'qualified' || toStatus === 'closed_won';
  const showSiteVisit = toStatus === 'site_visit_scheduled';
  const showCustomerResponse = toStatus === 'contacted';

  useEffect(() => {
    if (open && showSiteVisit && profile?.branch_id) {
      supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('branch_id', profile.branch_id)
        .eq('staff_type', 'operational')
        .eq('is_approved', true)
        .then(({ data }) => {
          if (data) setOpsStaff(data);
        });
    }
  }, [open, showSiteVisit, profile?.branch_id]);

  const setPresetFollowup = (preset: 'tomorrow' | '2days' | 'week' | 'month') => {
    let date: Date;
    switch (preset) {
      case 'tomorrow':
        date = addDays(new Date(), 1);
        break;
      case '2days':
        date = addDays(new Date(), 2);
        break;
      case 'week':
        date = addWeeks(new Date(), 1);
        break;
      case 'month':
        date = addMonths(new Date(), 1);
        break;
    }
    setFollowupDate(format(date, 'yyyy-MM-dd'));
    setFollowupTime('10:00');
  };

  const handleConfirm = () => {
    let followupAt: Date | undefined;
    if (followupDate && followupTime) {
      followupAt = new Date(`${followupDate}T${followupTime}`);
    } else if (followupDate) {
      followupAt = new Date(followupDate);
    }

    let siteVisitDateTime: Date | undefined;
    if (siteVisitDate && siteVisitTime) {
      siteVisitDateTime = new Date(`${siteVisitDate}T${siteVisitTime}`);
    } else if (siteVisitDate) {
      siteVisitDateTime = new Date(siteVisitDate);
    }

    onConfirm({
      callNotes,
      customerResponse: showCustomerResponse ? customerResponse : undefined,
      followupAt,
      propertyId: showProperty ? selectedProperty : undefined,
      siteVisitTime: siteVisitDateTime,
      assignedStaffId: showSiteVisit && selectedStaff ? selectedStaff : undefined,
    });

    // Reset form
    setCallNotes('');
    setCustomerResponse('');
    setFollowupDate('');
    setFollowupTime('');
    setSelectedProperty('');
    setSiteVisitDate('');
    setSiteVisitTime('');
    setSelectedStaff('');
  };

  const getTitle = () => {
    switch (toStatus) {
      case 'contacted':
        return 'Add Call Notes';
      case 'qualified':
        return 'Qualify Lead';
      case 'site_visit_scheduled':
        return 'Schedule Site Visit';
      case 'need_followup':
        return 'Set Followup';
      case 'closed_won':
        return 'Convert to Sale';
      default:
        return 'Update Status';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Moving <span className="font-medium text-foreground">{leadName}</span> to{' '}
            <span className="font-medium text-primary">{toStatus.replace(/_/g, ' ')}</span>
          </p>

          {showCustomerResponse && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                What did the customer say?
              </Label>
              <Textarea
                placeholder="Customer's response..."
                value={customerResponse}
                onChange={(e) => setCustomerResponse(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Call Notes</Label>
            <Textarea
              placeholder="Add notes about this interaction..."
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              rows={3}
            />
          </div>

          {showProperty && properties.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Property of Interest
              </Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showSiteVisit && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Site Visit Schedule
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={siteVisitDate}
                  onChange={(e) => setSiteVisitDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={siteVisitTime}
                  onChange={(e) => setSiteVisitTime(e.target.value)}
                  className="w-28"
                />
              </div>
            </div>
          )}

          {showSiteVisit && opsStaff.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Assign Operational Staff
              </Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {opsStaff.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name || 'Unnamed'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showFollowup && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Follow-up Date & Time
              </Label>
              <div className="flex gap-2 flex-wrap mb-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPresetFollowup('tomorrow')}>
                  Tomorrow
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPresetFollowup('2days')}>
                  After 2 Days
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPresetFollowup('week')}>
                  Next Week
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPresetFollowup('month')}>
                  Next Month
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={followupTime}
                  onChange={(e) => setFollowupTime(e.target.value)}
                  className="w-28"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
